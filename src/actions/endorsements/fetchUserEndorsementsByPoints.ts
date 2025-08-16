"use server";

import { db } from "@/services/db";
import { endorsementsTable } from "@/db/tables/endorsementsTable";
import { eq, and, inArray } from "drizzle-orm";

export interface UserPointEndorsement {
  pointId: number;
  cred: number;
  userId: string;
}

/**
 * Batch fetch user endorsements for multiple points
 * Used for OP badge data loading
 */
export async function fetchUserEndorsementsByPoints(
  userId: string,
  pointIds: number[]
): Promise<UserPointEndorsement[]> {
  if (pointIds.length === 0) return [];

  const endorsements = await db
    .select({
      pointId: endorsementsTable.pointId,
      cred: endorsementsTable.cred,
      userId: endorsementsTable.userId,
    })
    .from(endorsementsTable)
    .where(
      and(
        eq(endorsementsTable.userId, userId),
        inArray(endorsementsTable.pointId, pointIds)
      )
    );

  return endorsements;
}