"use server";

import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { pointsTable } from "@/db/tables/pointsTable";
import { isWithinDeletionTimelock } from "@/lib/negation-game/deleteTimelock";
import { negationsTable } from "@/db/tables/negationsTable";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { eq, sql, and, or } from "drizzle-orm";

export interface ValidationResult {
  canDelete: boolean;
  errors: string[];
  warnings: string[];
  point?: {
    id: number;
    content: string;
    createdAt: Date;
    createdBy: string;
  };
}

export const validatePointDeletion = async (
  pointId: number
): Promise<ValidationResult> => {
  const userId = await getUserId();

  if (!userId) {
    return {
      canDelete: false,
      errors: ["Must be authenticated to delete a point"],
      warnings: [],
    };
  }

  try {
    // 1. Get the point details
    const [point] = await db
      .select({
        id: pointsTable.id,
        content: pointsTable.content,
        createdBy: pointsTable.createdBy,
        createdAt: pointsTable.createdAt,
        isActive: pointsTable.isActive,
      })
      .from(pointsTable)
      .where(eq(pointsTable.id, pointId));

    if (!point) {
      return {
        canDelete: false,
        errors: ["Point not found"],
        warnings: [],
      };
    }

    if (!point.isActive) {
      return {
        canDelete: false,
        errors: ["Point is already deleted"],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 2. Check ownership
    if (point.createdBy !== userId) {
      errors.push("You can only delete your own points");
    }

    // 3. Check time window
    if (!isWithinDeletionTimelock(point.createdAt)) {
      errors.push("Points can only be deleted within 8 hours of creation");
    }

    // 4. Check if point is in any rationale (viewpoint graph)
    const viewpointsWithPoint = await db
      .select({ 
        id: viewpointsTable.id,
        title: viewpointsTable.title 
      })
      .from(viewpointsTable)
      .where(
        sql`${viewpointsTable.graph}::text LIKE ${'%"pointId":' + pointId + '%'}`
      );

    if (viewpointsWithPoint.length > 0) {
      const rationaleNames = viewpointsWithPoint.map(v => v.title).join(", ");
      errors.push(
        `Cannot delete points that are part of ${viewpointsWithPoint.length} rationale(s): ${rationaleNames}`
      );
    }

    // 5. Check negation constraints
    const negations = await db
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
    const isNegatingOthers = negations.some((n) => n.newerPointId === pointId);

    if (isBeingNegated) {
      const negatingCount = negations.filter((n) => n.olderPointId === pointId).length;
      errors.push(
        `Cannot delete points that are being negated by ${negatingCount} other point(s)`
      );
    }

    if (isNegatingOthers) {
      const negatedCount = negations.filter((n) => n.newerPointId === pointId).length;
      warnings.push(
        `Deleting this point will remove ${negatedCount} negation relationship(s)`
      );
    }

    return {
      canDelete: errors.length === 0,
      errors,
      warnings,
      point: {
        id: point.id,
        content: point.content,
        createdAt: point.createdAt,
        createdBy: point.createdBy,
      },
    };
  } catch (error) {
    console.error("Error validating point deletion:", error);
    return {
      canDelete: false,
      errors: ["An error occurred while validating deletion"],
      warnings: [],
    };
  }
};