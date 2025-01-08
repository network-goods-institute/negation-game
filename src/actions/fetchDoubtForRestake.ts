"use server";

import { doubtsTable, restakesTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql } from "drizzle-orm";
import { getUserId } from "./getUserId";

export const fetchDoubtForRestake = async (pointId: number, negationId: number) => {
  const userId = await getUserId();

  // First check if there are any doubts at all
  const doubtsExist = await db
    .select()
    .from(doubtsTable)
    .where(
      and(
        eq(doubtsTable.pointId, pointId),
        eq(doubtsTable.negationId, negationId),
        sql`${doubtsTable.amount} > 0`
      )
    )
    .limit(1);

  // If no doubts exist at all, return null instead of zero values
  if (doubtsExist.length === 0) {
    return null;
  }

  // Get both total amount and user's doubts in one query
  const result = await db.select({
    totalAmount: sql<number>`COALESCE(SUM(${doubtsTable.amount}), 0)`,
    userDoubts: sql<{id: number, amount: number, createdAt: Date}[]>`
      ARRAY(
        SELECT json_build_object(
          'id', d2.id,
          'amount', d2.amount,
          'createdAt', d2.created_at
        )
        FROM ${doubtsTable} d2 
        WHERE d2.user_id = ${userId}
          AND d2.point_id = ${pointId}
          AND d2.negation_id = ${negationId}
          AND d2.amount > 0
        ORDER BY d2.created_at DESC
      )
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


  const userDoubts = result[0].userDoubts || [];
  
  const response = {
    amount: Number(result[0].totalAmount),
    userDoubts,
    userAmount: userDoubts.reduce((sum, d) => sum + d.amount, 0),
    isUserDoubt: result[0].hasUserDoubt
  };

  return response;
}; 