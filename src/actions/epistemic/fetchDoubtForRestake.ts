"use server";

import { doubtsTable, effectiveRestakesView } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql } from "drizzle-orm";
import { getUserId } from "@/actions/users/getUserId";

export const fetchDoubtForRestake = async (
  pointId: number,
  negationId: number
) => {
  const userId = await getUserId();

  // First get basic availability and total amounts
  const [basicData] = await db
    .select({
      hasAvailableRestakes: sql<boolean>`EXISTS (
        SELECT 1 
        FROM ${effectiveRestakesView}
        WHERE point_id = ${pointId}
        AND negation_id = ${negationId}
        AND available_for_doubts = true
      )`,
      totalAmount: sql<number>`COALESCE((
        SELECT SUM(${doubtsTable.amount})
        FROM ${doubtsTable}
        WHERE point_id = ${pointId}
        AND negation_id = ${negationId}
        AND ${doubtsTable.amount} > 0
        AND EXISTS (
          SELECT 1 
          FROM ${effectiveRestakesView} er
          WHERE er.point_id = ${doubtsTable.pointId}
          AND er.negation_id = ${doubtsTable.negationId}
          AND er.created_at <= ${doubtsTable.createdAt}
          AND er.available_for_doubts = true
        )
      ), 0)`,
    })
    .from(sql`(SELECT 1) as dummy`);

  if (!basicData?.hasAvailableRestakes) {
    return null;
  }

  // Then get user-specific doubts if user is authenticated
  let userDoubts: { id: number; amount: number; createdAt: Date }[] = [];

  if (userId) {
    // Get user doubts with temporal constraint
    const userDoubtsWithConstraint = await db
      .select({
        id: doubtsTable.id,
        amount: doubtsTable.amount,
        createdAt: doubtsTable.createdAt,
      })
      .from(doubtsTable)
      .where(
        and(
          eq(doubtsTable.userId, userId),
          eq(doubtsTable.pointId, pointId),
          eq(doubtsTable.negationId, negationId),
          sql`${doubtsTable.amount} > 0`,
          sql`EXISTS (
            SELECT 1 
            FROM ${effectiveRestakesView} er
            WHERE er.point_id = ${doubtsTable.pointId}
            AND er.negation_id = ${doubtsTable.negationId}
            AND er.created_at <= ${doubtsTable.createdAt}
            AND er.available_for_doubts = true
          )`
        )
      )
      .orderBy(sql`${doubtsTable.createdAt} DESC`);

    userDoubts = userDoubtsWithConstraint;

    // Fallback: if no constrained doubts found, get all user doubts
    if (userDoubts.length === 0) {
      const allUserDoubts = await db
        .select({
          id: doubtsTable.id,
          amount: doubtsTable.amount,
          createdAt: doubtsTable.createdAt,
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
        .orderBy(sql`${doubtsTable.createdAt} DESC`);

      userDoubts = allUserDoubts;
    }
  }

  const userAmount = userDoubts.reduce((sum, d) => sum + d.amount, 0);

  return {
    amount: Number(basicData.totalAmount),
    userDoubts,
    userAmount,
    isUserDoubt: userAmount > 0,
  };
};
