"use server";

import { doubtsTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql } from "drizzle-orm";
import { getUserId } from "./getUserId";

export const fetchDoubtForRestake = async (pointId: number, negationId: number) => {
  const userId = await getUserId();

  // Get both total amount and user's doubt in one query
  const result = await db.select({
    totalAmount: sql<number>`COALESCE(SUM(${doubtsTable.amount}), 0)`,
    userDoubtAmount: sql<number>`
      COALESCE((
        SELECT amount 
        FROM ${doubtsTable} d2 
        WHERE d2.user_id = ${userId}
          AND d2.point_id = ${pointId}
          AND d2.negation_id = ${negationId}
          AND d2.amount > 0
      ), 0)
    `,
    hasUserDoubt: sql<boolean>`
      EXISTS (
        SELECT 1 
        FROM ${doubtsTable} d2 
        WHERE d2.user_id = ${userId}
          AND d2.point_id = ${pointId}
          AND d2.negation_id = ${negationId}
          AND d2.amount > 0
      )
    `
  })
  .from(doubtsTable)
  .where(
    and(
      eq(doubtsTable.pointId, pointId),
      eq(doubtsTable.negationId, negationId),
      sql`${doubtsTable.amount} > 0`
    )
  );

  return {
    amount: Number(result[0].totalAmount),
    userAmount: Number(result[0].userDoubtAmount),
    isUserDoubt: result[0].hasUserDoubt
  };
}; 