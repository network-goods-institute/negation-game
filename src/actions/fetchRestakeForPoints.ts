"use server";

import { effectiveRestakesView, restakesTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql, or } from "drizzle-orm";
import { getUserId } from "./getUserId";

export const fetchRestakeForPoints = async (pointId: number, negationId: number) => {
  const userId = await getUserId();
  console.log('fetchRestakeForPoints called with:', { pointId, negationId, userId });

  if (!userId) {
    return null;
  }

  // First get the total amount from all active restakes
  const [totals] = await db
    .select({
      totalRestakeAmount: sql<number>`
        SUM(${effectiveRestakesView.effectiveAmount})
        FILTER (WHERE ${effectiveRestakesView.isActive} = true)
      `.as('total_restake_amount')
    })
    .from(effectiveRestakesView)
    .where(
      or(
        and(
          eq(effectiveRestakesView.pointId, pointId),
          eq(effectiveRestakesView.negationId, negationId)
        ),
        and(
          eq(effectiveRestakesView.pointId, negationId),
          eq(effectiveRestakesView.negationId, pointId)
        )
      )
    );

  // Then get user's restake if it exists
  const [userRestake] = await db
    .select({
      id: restakesTable.id,
      userId: restakesTable.userId,
      effectiveAmount: effectiveRestakesView.effectiveAmount,
      amount: effectiveRestakesView.amount,
      slashedAmount: effectiveRestakesView.slashedAmount,
      doubtedAmount: effectiveRestakesView.doubtedAmount,
      isActive: effectiveRestakesView.isActive,
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
        or(
          and(
            eq(effectiveRestakesView.pointId, pointId),
            eq(effectiveRestakesView.negationId, negationId)
          ),
          and(
            eq(effectiveRestakesView.pointId, negationId),
            eq(effectiveRestakesView.negationId, pointId)
          )
        ),
        eq(effectiveRestakesView.userId, userId)
      )
    );

  console.log('Query results:', {
    totals,
    userRestake,
    totalRestakeAmount: totals?.totalRestakeAmount || 0
  });

  // Return either user's restake with total amount info, or just total amount info
  const result = userRestake 
    ? {
        ...userRestake,
        totalRestakeAmount: totals?.totalRestakeAmount || 0,
        isUserRestake: true
      }
    : {
        totalRestakeAmount: totals?.totalRestakeAmount || 0,
        isUserRestake: false
      };

  console.log('Returning result:', result);
  return result;
}; 