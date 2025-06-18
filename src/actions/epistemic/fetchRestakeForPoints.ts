"use server";

import { effectiveRestakesView, restakesTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql, or } from "drizzle-orm";
import { getUserId } from "@/actions/users/getUserId";

export const fetchRestakeForPoints = async (
  pointId: number,
  negationId: number
) => {
  const userId = await getUserId();

  if (!userId) {
    return null;
  }

  // First get the total amount from all non-fully-slashed restakes
  const [totals] = await db
    .select({
      totalRestakeAmount: sql<number>`
        SUM(${effectiveRestakesView.effectiveAmount})
        FILTER (WHERE ${effectiveRestakesView.slashedAmount} < ${effectiveRestakesView.amount}
          AND ${effectiveRestakesView.availableForDoubts} = true)
      `.as("total_restake_amount"),
      oldestRestakeTimestamp: sql<Date>`
        MIN(${effectiveRestakesView.createdAt})
        FILTER (WHERE ${effectiveRestakesView.availableForDoubts} = true)
      `.as("oldest_restake_timestamp"),
    })
    .from(effectiveRestakesView)
    .where(
      and(
        eq(effectiveRestakesView.pointId, pointId),
        eq(effectiveRestakesView.negationId, negationId)
      )
    );

  // Then get user's restake if it exists and isn't fully slashed
  const [userRestake] = await db
    .select({
      id: restakesTable.id,
      userId: restakesTable.userId,
      amount: effectiveRestakesView.amount,
      effectiveAmount: effectiveRestakesView.effectiveAmount,
      originalAmount: effectiveRestakesView.amount,
      slashedAmount: effectiveRestakesView.slashedAmount,
      doubtedAmount:
        sql<number>`COALESCE(${effectiveRestakesView.doubtedAmount}, 0)`.mapWith(
          Number
        ),
      createdAt: effectiveRestakesView.createdAt,
      availableForDoubts: effectiveRestakesView.availableForDoubts,
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
        eq(effectiveRestakesView.pointId, pointId),
        eq(effectiveRestakesView.negationId, negationId),
        eq(effectiveRestakesView.userId, userId),
        // Only return if not fully slashed
        sql`${effectiveRestakesView.slashedAmount} < ${effectiveRestakesView.amount}`
      )
    );

  // Return either user's restake with total amount info, or just total amount info
  if (userRestake) {
    return {
      id: userRestake.id,
      userId: userRestake.userId,
      amount: userRestake.amount,
      effectiveAmount: userRestake.effectiveAmount,
      originalAmount: userRestake.originalAmount,
      slashedAmount: userRestake.slashedAmount,
      doubtedAmount: userRestake.doubtedAmount,
      createdAt: userRestake.createdAt,
      availableForDoubts: userRestake.availableForDoubts,
      totalRestakeAmount: totals?.totalRestakeAmount || 0,
      oldestRestakeTimestamp: totals?.oldestRestakeTimestamp || null,
      isUserRestake: true,
    };
  }

  return {
    totalRestakeAmount: totals?.totalRestakeAmount || 0,
    oldestRestakeTimestamp: totals?.oldestRestakeTimestamp || null,
    isUserRestake: false,
  };
};
