"use server";

import { effectiveRestakesView, restakesTable, doubtsTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql, lte } from "drizzle-orm";
import { getUserId } from "./getUserId";

export const fetchRestakeForPoints = async (pointId: number, negationId: number, doubtId?: number) => {
  const userId = await getUserId();

  if (!userId) return null;

  // Always query with the smaller ID first
  const [smallerId, largerId] = pointId < negationId 
    ? [pointId, negationId] 
    : [negationId, pointId];

  // First get the doubt creation time if doubtId provided
  let doubtCreatedAt;
  if (doubtId) {
    const doubt = await db
      .select({ createdAt: doubtsTable.createdAt })
      .from(doubtsTable)
      .where(eq(doubtsTable.id, doubtId))
      .limit(1)
      .then(rows => rows[0]);
    
    doubtCreatedAt = doubt?.createdAt;
  }

  // Get all active restakes for this point pair
  const restakes = await db
    .select({
      id: restakesTable.id,
      userId: restakesTable.userId,
      effectiveAmount: effectiveRestakesView.effectiveAmount,
      amount: effectiveRestakesView.amount,
      slashedAmount: effectiveRestakesView.slashedAmount,
      doubtedAmount: effectiveRestakesView.doubtedAmount,
      isActive: effectiveRestakesView.isActive,
      totalRestakeAmount: sql<number>`
        SUM(${effectiveRestakesView.effectiveAmount})
      `.as('total_restake_amount')
    })
    .from(effectiveRestakesView)
    .innerJoin(
      restakesTable,
      and(
        eq(restakesTable.pointId, effectiveRestakesView.pointId),
        eq(restakesTable.negationId, effectiveRestakesView.negationId),
        eq(restakesTable.userId, effectiveRestakesView.userId),
        doubtCreatedAt ? lte(restakesTable.createdAt, doubtCreatedAt) : sql`1=1`
      )
    )
    .where(
      and(
        eq(effectiveRestakesView.pointId, smallerId),
        eq(effectiveRestakesView.negationId, largerId),
        eq(effectiveRestakesView.isActive, true)
      )
    )
    .groupBy(
      restakesTable.id,
      effectiveRestakesView.effectiveAmount,
      effectiveRestakesView.amount,
      effectiveRestakesView.slashedAmount,
      effectiveRestakesView.doubtedAmount,
      effectiveRestakesView.isActive,
      effectiveRestakesView.userId
    )
    .then(rows => rows);

  if (restakes.length === 0) return null;

  // Find the user's restake if it exists
  const userRestake = restakes.find(r => r.userId === userId);

  // Return user's restake if found, otherwise return first restake but with total amount
  return userRestake ?? {
    ...restakes[0],
    effectiveAmount: restakes[0].totalRestakeAmount,
    totalRestakeAmount: restakes[0].totalRestakeAmount
  };
}; 