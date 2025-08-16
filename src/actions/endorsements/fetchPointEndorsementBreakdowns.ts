"use server";

import { db } from "@/services/db";
import { endorsementsTable } from "@/db/tables/endorsementsTable";
import { usersTable } from "@/db/tables/usersTable";
import { eq, inArray } from "drizzle-orm";

export interface PointEndorsementBreakdown {
  pointId: number;
  breakdown: Array<{
    userId: string;
    username: string;
    cred: number;
  }>;
}

/**
 * Batch fetch detailed endorsement breakdowns for multiple points
 * Used for detailed OP badge hover information
 */
export async function fetchPointEndorsementBreakdowns(
  pointIds: number[]
): Promise<PointEndorsementBreakdown[]> {
  if (pointIds.length === 0) return [];

  const endorsements = await db
    .select({
      pointId: endorsementsTable.pointId,
      cred: endorsementsTable.cred,
      userId: endorsementsTable.userId,
      username: usersTable.username,
    })
    .from(endorsementsTable)
    .innerJoin(usersTable, eq(endorsementsTable.userId, usersTable.id))
    .where(inArray(endorsementsTable.pointId, pointIds));

  const groupedByPoint = endorsements.reduce(
    (
      acc: Record<
        number,
        Array<{ userId: string; username: string; cred: number }>
      >,
      endorsement
    ) => {
      if (!acc[endorsement.pointId]) {
        acc[endorsement.pointId] = [];
      }

      const existingUser = acc[endorsement.pointId].find(
        (u) => u.userId === endorsement.userId
      );
      if (existingUser) {
        existingUser.cred += endorsement.cred;
      } else {
        acc[endorsement.pointId].push({
          userId: endorsement.userId,
          username: endorsement.username,
          cred: endorsement.cred,
        });
      }
      return acc;
    },
    {}
  );

  return Object.entries(groupedByPoint).map(([pointId, breakdown]) => ({
    pointId: parseInt(pointId, 10),
    breakdown,
  }));
}
