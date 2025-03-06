"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import {
  endorsementsTable,
  pointsWithDetailsView,
  effectiveRestakesView,
  doubtsTable,
  pointFavorHistoryView,
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { db } from "@/services/db";
import { and, eq, sql } from "drizzle-orm";
import { FeedPoint } from "./fetchFeed";

export const fetchPriorityPoints = async (limit = 5): Promise<FeedPoint[]> => {
  const viewerId = await getUserId();
  if (!viewerId) return [];

  const space = await getSpace();

  // Get points endorsed by the user with their endorsement favor and current favor
  const pointsWithFavor = await db
    .select({
      pointId: pointsWithDetailsView.pointId,
      content: pointsWithDetailsView.content,
      createdAt: pointsWithDetailsView.createdAt,
      createdBy: pointsWithDetailsView.createdBy,
      space: pointsWithDetailsView.space,
      isCommand: pointsWithDetailsView.isCommand,
      amountNegations: sql<number>`"amount_negations"`.mapWith(Number),
      amountSupporters: sql<number>`"amount_supporters"`.mapWith(Number),
      cred: sql<number>`"point_with_details_view"."cred"`.mapWith(Number),
      negationsCred: sql<number>`"negations_cred"`.mapWith(Number),
      negationIds: sql<number[]>`"negation_ids"`,
      endorsementFavor: sql<number>`
        COALESCE((
          SELECT ${pointFavorHistoryView.favor}
          FROM ${pointFavorHistoryView}
          WHERE ${pointFavorHistoryView.pointId} = ${pointsWithDetailsView.pointId}
          AND ${pointFavorHistoryView.eventTime} <= ${endorsementsTable.createdAt}
          ORDER BY ${pointFavorHistoryView.eventTime} DESC
          LIMIT 1
        ), 0)
      `.mapWith(Number),
      viewerCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId}
            AND ${endorsementsTable.userId} = ${viewerId}
        ), 0)
      `.mapWith(Number),
      restakesByPoint: sql<number>`
        COALESCE((
          SELECT SUM(er.amount)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointsWithDetailsView.pointId}
            AND er.slashed_amount < er.amount
        ), 0)
      `.mapWith(Number),
      slashedAmount: sql<number>`
        COALESCE((
          SELECT SUM(er.slashed_amount)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointsWithDetailsView.pointId}
        ), 0)
      `.mapWith(Number),
      doubtedAmount: sql<number>`
        COALESCE((
          SELECT SUM(er.doubted_amount)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointsWithDetailsView.pointId}
        ), 0)
      `.mapWith(Number),
      totalRestakeAmount: sql<number>`
        COALESCE((
          SELECT SUM(CASE 
            WHEN er.slashed_amount >= er.amount THEN 0
            ELSE er.amount
          END)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointsWithDetailsView.pointId}
          AND er.negation_id = ANY("negation_ids")
        ), 0)
      `.mapWith(Number),
      doubt: {
        id: doubtsTable.id,
        amount: doubtsTable.amount,
        userAmount: doubtsTable.amount,
        isUserDoubt: sql<boolean>`${doubtsTable.userId} = ${viewerId}`.as(
          "is_user_doubt"
        ),
      },
    })
    .from(pointsWithDetailsView)
    .innerJoin(
      endorsementsTable,
      and(
        eq(endorsementsTable.pointId, pointsWithDetailsView.pointId),
        eq(endorsementsTable.userId, viewerId),
        eq(endorsementsTable.space, space),
        eq(pointsWithDetailsView.space, space)
      )
    )
    .leftJoin(
      doubtsTable,
      and(
        eq(doubtsTable.pointId, pointsWithDetailsView.pointId),
        eq(doubtsTable.userId, viewerId)
      )
    );

  const pointsWithCurrentFavor = await addFavor(pointsWithFavor);

  const uniquePoints = Array.from(
    new Map(
      pointsWithCurrentFavor.map((point) => [point.pointId, point])
    ).values()
  );

  // Sort by the difference between current favor and endorsement favor
  const sortedPoints = uniquePoints
    .sort((a, b) => {
      const aValueChange = a.favor - (a as any).endorsementFavor;
      const bValueChange = b.favor - (b as any).endorsementFavor;
      return bValueChange - aValueChange;
    })
    .slice(0, limit);

  return sortedPoints;
};
