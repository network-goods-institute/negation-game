"use server";

import { getUserId } from "@/actions/getUserId";
import { restakesTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq } from "drizzle-orm";

export const fetchRestakeForPoints = async (pointId: number, negationId: number) => {
  const userId = await getUserId();
  if (!userId) return null;

  return await db
    .select()
    .from(restakesTable)
    .where(
      and(
        eq(restakesTable.pointId, pointId),
        eq(restakesTable.negationId, negationId),
        eq(restakesTable.userId, userId),
        eq(restakesTable.active, true)
      )
    )
    .limit(1)
    .then(rows => rows[0] ?? null);
}; 