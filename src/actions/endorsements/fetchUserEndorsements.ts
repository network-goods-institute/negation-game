"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { endorsementsTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, inArray, sum, gt } from "drizzle-orm";

export interface FetchPointsOptions {
  originalPosterId?: string;
}

export const fetchUserEndorsements = async (
  userId: string,
  pointIds: number[]
) => {
  const space = await getSpace();

  return await db
    .select({
      pointId: endorsementsTable.pointId,
      cred: sum(endorsementsTable.cred).mapWith(Number),
    })
    .from(endorsementsTable)
    .where(
      and(
        inArray(endorsementsTable.pointId, pointIds),
        eq(endorsementsTable.space, space),
        eq(endorsementsTable.userId, userId),
        gt(endorsementsTable.cred, 0)
      )
    )
    .groupBy(endorsementsTable.pointId);
};
