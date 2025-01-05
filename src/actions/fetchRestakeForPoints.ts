"use server";

import { effectiveRestakesView, restakesTable, doubtsTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql, lte } from "drizzle-orm";
import { getUserId } from "./getUserId";

export const fetchRestakeForPoints = async (pointId: number, negationId: number) => {
  const userId = await getUserId();

  if (!userId) {
    return null;
  }

  // Always query with the smaller ID first
  const [smallerId, largerId] = pointId < negationId 
    ? [pointId, negationId] 
    : [negationId, pointId];

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
        FILTER (WHERE ${effectiveRestakesView.isActive} = true)
      `.as('total_restake_amount')
    })
    .from(effectiveRestakesView)
    .innerJoin(
      restakesTable,
      and(
        eq(restakesTable.pointId, effectiveRestakesView.pointId),
        eq(restakesTable.negationId, effectiveRestakesView.negationId),
        eq(restakesTable.userId, effectiveRestakesView.userId)
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
    );

  if (restakes.length === 0) {
    return null;
  }

  // Find the user's restake if it exists
  const userRestake = restakes.find(r => r.userId === userId);

  // Return user's restake if found, otherwise return first restake but with total amount
  const result = userRestake ?? {
    ...restakes[0],
    effectiveAmount: restakes[0].totalRestakeAmount,
    totalRestakeAmount: restakes[0].totalRestakeAmount
  };

  return result;
}; 