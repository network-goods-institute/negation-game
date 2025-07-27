"use server";

import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { pointsTable } from "@/db/tables/pointsTable";
import { isWithinDeletionTimelock } from "@/lib/negation-game/deleteTimelock";
import { endorsementsTable } from "@/db/tables/endorsementsTable";
import { doubtsTable } from "@/db/tables/doubtsTable";
import { negationsTable } from "@/db/tables/negationsTable";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { usersTable } from "@/db/schema";
import { eq, sql, and, or } from "drizzle-orm";

export interface DeletePointInput {
  pointId: number;
}

export const deletePoint = async ({
  pointId,
}: DeletePointInput): Promise<{ success: boolean; message: string }> => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to delete a point");
  }

  return await db
    .transaction(async (tx) => {
      // 1. Verify the point exists and belongs to the user
      const [point] = await tx
        .select({
          id: pointsTable.id,
          createdBy: pointsTable.createdBy,
          createdAt: pointsTable.createdAt,
          isActive: pointsTable.isActive,
        })
        .from(pointsTable)
        .where(eq(pointsTable.id, pointId));

      if (!point) {
        return { success: false, message: "Point not found" };
      }

      if (point.createdBy !== userId) {
        return {
          success: false,
          message: "You can only delete your own points",
        };
      }

      if (!point.isActive) {
        return {
          success: false,
          message: "Point is already deleted",
        };
      }

      // 2. Check if the point is within the time window for deletion (8 hours)
      if (!isWithinDeletionTimelock(point.createdAt)) {
        return {
          success: false,
          message: "Points can only be deleted within 8 hours of creation",
        };
      }

      // 3. Check if point is in any rationale (viewpoint graph)
      const viewpointsWithPoint = await tx
        .select({ id: viewpointsTable.id })
        .from(viewpointsTable)
        .where(
          sql`${viewpointsTable.graph}::text LIKE ${'%"pointId":' + pointId + '%'}`
        );

      if (viewpointsWithPoint.length > 0) {
        return {
          success: false,
          message: "Cannot delete points that are part of a rationale",
        };
      }

      // 4. Check negation constraints
      const negations = await tx
        .select({
          id: negationsTable.id,
          olderPointId: negationsTable.olderPointId,
          newerPointId: negationsTable.newerPointId,
        })
        .from(negationsTable)
        .where(
          and(
            or(
              eq(negationsTable.olderPointId, pointId),
              eq(negationsTable.newerPointId, pointId)
            ),
            eq(negationsTable.isActive, true)
          )
        );

      // Check if this point is being negated (is the older point in a negation)
      const isBeingNegated = negations.some((n) => n.olderPointId === pointId);

      if (isBeingNegated) {
        return {
          success: false,
          message:
            "Cannot delete points that are being negated by other points",
        };
      }

      // 5. Reimburse all endorsements
      const endorsements = await tx
        .select({
          id: endorsementsTable.id,
          userId: endorsementsTable.userId,
          cred: endorsementsTable.cred,
        })
        .from(endorsementsTable)
        .where(eq(endorsementsTable.pointId, pointId));

      // Group endorsements by user to reimburse the total amount per user
      const credByUser = endorsements.reduce(
        (acc, { userId, cred }) => {
          acc[userId] = (acc[userId] || 0) + cred;
          return acc;
        },
        {} as Record<string, number>
      );

      // Reimburse each user for endorsements
      for (const [userId, credAmount] of Object.entries(credByUser)) {
        await tx
          .update(usersTable)
          .set({
            cred: sql`${usersTable.cred} + ${credAmount}`,
          })
          .where(eq(usersTable.id, userId));
      }

      // 6. Reimburse all doubts
      const doubts = await tx
        .select({
          id: doubtsTable.id,
          userId: doubtsTable.userId,
          amount: doubtsTable.amount,
        })
        .from(doubtsTable)
        .where(
          or(
            eq(doubtsTable.pointId, pointId),
            eq(doubtsTable.negationId, pointId)
          )
        );

      // Group doubts by user to reimburse the total amount per user
      const doubtCredByUser = doubts.reduce(
        (acc, { userId, amount }) => {
          acc[userId] = (acc[userId] || 0) + amount;
          return acc;
        },
        {} as Record<string, number>
      );

      // Reimburse each user for doubts
      for (const [userId, credAmount] of Object.entries(doubtCredByUser)) {
        await tx
          .update(usersTable)
          .set({
            cred: sql`${usersTable.cred} + ${credAmount}`,
          })
          .where(eq(usersTable.id, userId));
      }

      // 7. Soft delete the point
      await tx
        .update(pointsTable)
        .set({
          isActive: false,
          deletedAt: new Date(),
          deletedBy: userId,
        })
        .where(eq(pointsTable.id, pointId));

      // 8. Soft delete any negations where this point is the newer point or the older point
      const negationsToDelete = negations.filter(
        (n) => n.newerPointId === pointId || n.olderPointId === pointId
      );

      for (const negation of negationsToDelete) {
        await tx
          .update(negationsTable)
          .set({
            isActive: false,
            deletedAt: new Date(),
            deletedBy: userId,
          })
          .where(eq(negationsTable.id, negation.id));
      }

      return {
        success: true,
        message: "Point deleted successfully and all cred reimbursed",
      };
    })
    .catch((error) => {
      console.error("Error deleting point:", error);
      return {
        success: false,
        message: "An error occurred while deleting the point",
      };
    });
};
