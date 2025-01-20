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
    amount: number | null;
    active: boolean;
    originalAmount: number | null;
    slashedAmount: number | null;
    doubtedAmount: number | null;
    totalRestakeAmount: number | null;
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
    userAmount: number;
  } | null;
  favor: number;
  restakesByPoint: number;
  slashedAmount: number;
  doubtedAmount: number;
};

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
      restakesByPoint: sql<number>`
        COALESCE(
          (SELECT SUM(er1.amount)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}
           AND er1.is_active = true), 
          0
        )
      `.mapWith(Number),
      slashedAmount: sql<number>`
        COALESCE(
          (SELECT SUM(er1.slashed_amount)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}), 
          0
        )
      `.mapWith(Number),
      doubtedAmount: sql<number>`
        COALESCE(
          (SELECT SUM(er1.doubted_amount)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}), 
          0
        )
      `.mapWith(Number),
      restake: {
        id: restakesTable.id,
        userId: restakesTable.userId,
        // done in order to differentiate between "inactivity" due to doubts versus slashes
        // inactivity due to slashes do not need to be rendered in the UI
        // inactivity due to doubts should be rendered in the UI
        amount: sql<number>`
          CASE 
            WHEN ${effectiveRestakesView.slashedAmount} >= ${effectiveRestakesView.amount} THEN 0
            ELSE ${effectiveRestakesView.amount}
          END
        `.mapWith(Number),
        active: effectiveRestakesView.isActive,
        originalAmount: effectiveRestakesView.amount,
        slashedAmount: effectiveRestakesView.slashedAmount,
        doubtedAmount: sql<number>`COALESCE(${effectiveRestakesView.doubtedAmount}, 0)`.mapWith(Number),
        totalRestakeAmount: sql<number>`
          SUM(
            CASE 
              WHEN ${effectiveRestakesView.slashedAmount} >= ${effectiveRestakesView.amount} THEN 0
              ELSE ${effectiveRestakesView.amount}
            END
          ) OVER (
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
        active: sql<boolean>`${doubtsTable.amount} > 0`.as("doubt_active"),
        userAmount: doubtsTable.amount,
      },
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
        eq(effectiveRestakesView.negationId, pointsWithDetailsView.pointId)
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
        eq(pointsWithDetailsView.space, space)
      )
    )
    .then((points) => {
      return addFavor(points);
    });

  return results;
};