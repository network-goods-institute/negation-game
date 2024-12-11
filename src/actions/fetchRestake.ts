"use server";

import { getUserId } from "@/actions/getUserId";
import { restakesTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq } from "drizzle-orm";

export const fetchRestake = async (pointId: number, negationId: number) => {
  const userId = await getUserId();
  if (!userId) return null;

  const [smallerId, largerId] = pointId < negationId 
    ? [pointId, negationId] 
    : [negationId, pointId];

  return await db
    .select()
    .from(restakesTable)
    .where(
      and(
        eq(restakesTable.userId, userId),
        eq(restakesTable.pointId, smallerId),
        eq(restakesTable.negationId, largerId),
        eq(restakesTable.active, true)
      )
    )
    .limit(1)
    .then(rows => rows[0] ?? null);
}; 