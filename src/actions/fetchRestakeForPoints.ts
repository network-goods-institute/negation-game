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

  // Find user's restake
  const userRestake = restakes.find(r => r.userId === userId);
  
  // Calculate total restake amount from all active restakes
  const totalRestakeAmount = restakes.reduce((sum, r) => sum + Number(r.effectiveAmount), 0);

  // Return either user's restake with total amount info, or just total amount info
  return userRestake 
    ? {
        ...userRestake,
        totalRestakeAmount,
        isUserRestake: true
      }
    : {
        totalRestakeAmount,
        isUserRestake: false
      };
}; 