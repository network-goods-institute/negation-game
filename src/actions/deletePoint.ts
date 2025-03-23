"use server";

import { getUserId } from "@/actions/getUserId";
import { db } from "@/services/db";
import { pointsTable } from "@/db/tables/pointsTable";
import { isWithinDeletionTimelock } from "@/lib/deleteTimelock";
import { endorsementsTable } from "@/db/tables/endorsementsTable";
import { doubtsTable } from "@/db/tables/doubtsTable";
import { usersTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

function or(...conditions: unknown[]) {
  return sql`(${conditions.join(" OR ")})`;
}

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

      // 2. Check if the point is within the time window for deletion (8 hours)
      if (!isWithinDeletionTimelock(point.createdAt)) {
        return {
          success: false,
          message: "Points can only be deleted within 8 hours of creation",
        };
      }

      // 3. Reimburse all endorsements
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

      // 4. Reimburse all doubts - doubts DO cost cred
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

      // 5. Delete all related data
      // We rely on CASCADE DELETE for most relations through foreign keys

      // 6. Hard delete the point itself
      await tx.delete(pointsTable).where(eq(pointsTable.id, pointId));

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
