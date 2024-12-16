"use server";

import { doubtsTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql } from "drizzle-orm";
import { getUserId } from "./getUserId";

export const fetchDoubtForRestake = async (pointId: number, negationId: number) => {
  const userId = await getUserId();
  if (!userId) return null;

  return await db
    .select({
      id: doubtsTable.id,
      amount: doubtsTable.amount,
      lastEarningsAt: doubtsTable.lastEarningsAt,
      createdAt: doubtsTable.createdAt
    })
    .from(doubtsTable)
    .where(
      and(
        eq(doubtsTable.userId, userId),
        eq(doubtsTable.pointId, pointId),
        eq(doubtsTable.negationId, negationId),
        sql`${doubtsTable.amount} > 0`
      )
    )
    .limit(1)
    .then(rows => rows[0] ?? null);
}; 