"use server";

import { db } from "@/services/db";
import { pointsWithDetailsView, effectiveRestakesView, slashesTable, doubtsTable, restakesTable } from "@/db/schema";
import { eq, or, and, ne, sql } from "drizzle-orm";
import { negationsTable } from "@/db/tables/negationsTable";
import { getUserId } from "@/actions/getUserId";

export type NegationResult = {
  id: number;
  content: string;
  createdAt: Date;
  cred: number;
  amountSupporters: number;
  amountNegations: number;
  negationsCred: number;
  restake: {
    id: number | null;
    amount: number;
    active: boolean;
    originalAmount: number | null;
    slashedAmount: number;
    doubtedAmount: number;
    totalRestakeAmount: number;
    isOwner: boolean;
  } | null;
  slash: {
    id: number;
    amount: number;
    active: boolean;
  } | null;
  doubt: {
    id: number;
    amount: number;
    active: boolean;
  } | null;
  favor: number;
}

export const fetchPointNegations = async (pointId: number): Promise<NegationResult[]> => {
  const userId = await getUserId();
  
  const results = await db
    .selectDistinct({
      id: pointsWithDetailsView.id,
      content: pointsWithDetailsView.content,
      createdAt: pointsWithDetailsView.createdAt,
      cred: pointsWithDetailsView.cred,
      amountSupporters: pointsWithDetailsView.amountSupporters,
      amountNegations: pointsWithDetailsView.amountNegations,
      negationsCred: pointsWithDetailsView.negationsCred,
      restake: {
        id: restakesTable.id,
        amount: effectiveRestakesView.effectiveAmount,
        active: effectiveRestakesView.isActive,
        originalAmount: effectiveRestakesView.amount,
        slashedAmount: effectiveRestakesView.slashedAmount,
        doubtedAmount: sql<number>`
          COALESCE((
            SELECT SUM(${doubtsTable.amount})::integer
            FROM ${doubtsTable}
            WHERE ${doubtsTable.pointId} = ${restakesTable.pointId}
            AND ${doubtsTable.negationId} = ${restakesTable.negationId}
          ), 0)
        `.mapWith(Number)
        .as("doubted_amount"),
        totalRestakeAmount: sql<number>`
          SUM(${effectiveRestakesView.effectiveAmount}) OVER (
            PARTITION BY ${effectiveRestakesView.pointId}, ${effectiveRestakesView.negationId}
          )
        `.as('total_restake_amount'),
        isOwner: sql<boolean>`${effectiveRestakesView.userId} = ${userId}`.as('is_owner')
      },
      slash: {
        id: slashesTable.id,
        amount: slashesTable.amount,
        active: sql<boolean>`${slashesTable.amount} > 0`.as("slash_active")
      },
      doubt: {
        id: doubtsTable.id,
        amount: doubtsTable.amount,
        active: sql<boolean>`${doubtsTable.amount} > 0`.as("doubt_active")
      },
      favor: sql<number>`
        COALESCE((
          SELECT favor 
          FROM point_favor_history 
          WHERE point_id = ${pointsWithDetailsView.id}
          AND event_type = 'favor_queried'
          ORDER BY event_time DESC 
          LIMIT 1
        ), 50)
      `.mapWith(Number)
    })
    .from(pointsWithDetailsView)
    .innerJoin(
      negationsTable,
      or(
        eq(negationsTable.newerPointId, pointsWithDetailsView.id),
        eq(negationsTable.olderPointId, pointsWithDetailsView.id)
      )
    )
    .leftJoin(
      effectiveRestakesView,
      and(
        eq(effectiveRestakesView.pointId, pointId),
        eq(effectiveRestakesView.negationId, pointsWithDetailsView.id),
        eq(effectiveRestakesView.isActive, true)
      )
    )
    .leftJoin(
      restakesTable,
      and(
        eq(restakesTable.pointId, effectiveRestakesView.pointId),
        eq(restakesTable.negationId, effectiveRestakesView.negationId),
        eq(restakesTable.userId, effectiveRestakesView.userId)
      )
    )
    .leftJoin(
      slashesTable,
      and(
        eq(slashesTable.pointId, pointId),
        eq(slashesTable.negationId, pointsWithDetailsView.id),
        eq(slashesTable.userId, userId ?? '')
      )
    )
    .leftJoin(
      doubtsTable,
      and(
        eq(doubtsTable.pointId, pointId),
        eq(doubtsTable.negationId, pointsWithDetailsView.id),
        eq(doubtsTable.userId, userId ?? '')
      )
    )
    .where(
      and(
        or(
          eq(negationsTable.olderPointId, pointId),
          eq(negationsTable.newerPointId, pointId)
        ),
        ne(pointsWithDetailsView.id, pointId)
      )
    );

  return results;
};
