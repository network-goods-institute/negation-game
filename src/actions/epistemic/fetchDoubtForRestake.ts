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

  // First check if there are any available restakes to doubt
  const [availableRestakes] = await db
    .select({
      hasAvailableRestakes: sql<boolean>`EXISTS (
        SELECT 1 
        FROM ${effectiveRestakesView}
        WHERE point_id = ${pointId}
        AND negation_id = ${negationId}
        AND available_for_doubts = true
      )`,
    })
    .from(effectiveRestakesView);

  if (!availableRestakes?.hasAvailableRestakes) {
    return null;
  }

  // Get both total amount and user's doubts in one query
  const result = await db
    .select({
      totalAmount: sql<number>`COALESCE(SUM(${doubtsTable.amount}), 0)`,
      userDoubts: sql<{ id: number; amount: number; createdAt: Date }[]>`
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
          AND EXISTS (
            SELECT 1 
            FROM ${effectiveRestakesView} er
            WHERE er.point_id = d2.point_id
            AND er.negation_id = d2.negation_id
            AND er.created_at <= d2.created_at
            AND er.available_for_doubts = true
          )
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
          AND EXISTS (
            SELECT 1 
            FROM ${effectiveRestakesView} er
            WHERE er.point_id = d2.point_id
            AND er.negation_id = d2.negation_id
            AND er.created_at <= d2.created_at
            AND er.available_for_doubts = true
          )
      )
    `,
    })
    .from(doubtsTable)
    .where(
      and(
        eq(doubtsTable.pointId, pointId),
        eq(doubtsTable.negationId, negationId),
        sql`${doubtsTable.amount} > 0`,
        // Only include doubts that have corresponding available restakes
        sql`EXISTS (
          SELECT 1 
          FROM ${effectiveRestakesView} er
          WHERE er.point_id = ${doubtsTable.pointId}
          AND er.negation_id = ${doubtsTable.negationId}
          AND er.created_at <= ${doubtsTable.createdAt}
          AND er.available_for_doubts = true
        )`
      )
    );

  // Use the strict result first.
  let userDoubts: { id: number; amount: number; createdAt: Date }[] =
    (result[0].userDoubts as unknown as {
      id: number;
      amount: number;
      createdAt: Date;
    }[]) || [];

  // If the strict query returned no rows for the current user, perform a
  // fallback query that ignores the `available_for_doubts` constraint so that
  // we still surface the user's active doubt (even if all restakes that made
  // it valid have since been slashed).
  if (userDoubts.length === 0 && userId) {
    userDoubts = await db
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
      .orderBy(sql`created_at DESC`);
  }

  const userAmount = userDoubts.reduce((sum, d) => sum + d.amount, 0);

  const response = {
    amount: Number(result[0].totalAmount),
    userDoubts,
    userAmount,
    isUserDoubt: userAmount > 0,
  };

  return response;
};
