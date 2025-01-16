"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import { 
  pointsWithDetailsView, 
  effectiveRestakesView, 
  slashesTable, 
  doubtsTable, 
  restakesTable,
  negationsTable,
  endorsementsTable 
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { eq, or, and, ne, sql } from "drizzle-orm";
import { db } from "@/services/db";

export type NegationResult = {
  pointId: number;
  content: string;
  createdAt: Date;
  createdBy: string;
  cred: number;
  amountSupporters: number;
  amountNegations: number;
  negationsCred: number;
  space: string | null;
  viewerCred: number;
  negationIds: number[];
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
  const space = await getSpace();
  
  const results = await db
    .selectDistinct({
      pointId: pointsWithDetailsView.pointId,
      content: pointsWithDetailsView.content,
      createdAt: pointsWithDetailsView.createdAt,
      createdBy: pointsWithDetailsView.createdBy,
      cred: pointsWithDetailsView.cred,
      amountSupporters: pointsWithDetailsView.amountSupporters,
      amountNegations: pointsWithDetailsView.amountNegations,
      negationsCred: pointsWithDetailsView.negationsCred,
      space: pointsWithDetailsView.space,
      negationIds: pointsWithDetailsView.negationIds,
      viewerCred: userId ? sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId}
            AND ${endorsementsTable.userId} = ${userId}
        ), 0)
      `.mapWith(Number) : sql<number>`0`.mapWith(Number),
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
      }
    })
    .from(pointsWithDetailsView)
    .innerJoin(
      negationsTable,
      or(
        eq(negationsTable.newerPointId, pointsWithDetailsView.pointId),
        eq(negationsTable.olderPointId, pointsWithDetailsView.pointId)
      )
    )
    .leftJoin(
      effectiveRestakesView,
      and(
        eq(effectiveRestakesView.pointId, pointId),
        eq(effectiveRestakesView.negationId, pointsWithDetailsView.pointId),
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
        eq(slashesTable.negationId, pointsWithDetailsView.pointId),
        eq(slashesTable.userId, userId ?? '')
      )
    )
    .leftJoin(
      doubtsTable,
      and(
        eq(doubtsTable.pointId, pointId),
        eq(doubtsTable.negationId, pointsWithDetailsView.pointId),
        eq(doubtsTable.userId, userId ?? '')
      )
    )
    .where(
      and(
        or(
          eq(negationsTable.olderPointId, pointId),
          eq(negationsTable.newerPointId, pointId)
        ),
        ne(pointsWithDetailsView.pointId, pointId),
        eq(pointsWithDetailsView.space, space)
      )
    );

  return addFavor(results);
};
