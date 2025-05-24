"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
import {
  endorsementsTable,
  pointsWithDetailsView,
  doubtsTable,
  pointFavorHistoryView,
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { db } from "@/services/db";
import { and, eq, sql } from "drizzle-orm";
import { FeedPoint } from "@/actions/feed/fetchFeed";
import {
  viewerCredSql,
  restakesByPointSql,
  slashedAmountSql,
  doubtedAmountSql,
  totalRestakeAmountSql,
  viewerDoubtSql,
} from "@/actions/utils/pointSqlUtils";

export const fetchPriorityPoints = async (limit = 5): Promise<FeedPoint[]> => {
  const viewerId = await getUserId();
  // Return empty array for non-logged-in users
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
      viewerCred: viewerCredSql(viewerId),
      restakesByPoint: restakesByPointSql(pointsWithDetailsView),
      slashedAmount: slashedAmountSql(pointsWithDetailsView),
      doubtedAmount: doubtedAmountSql(pointsWithDetailsView),
      totalRestakeAmount: totalRestakeAmountSql,
      doubt: viewerId
        ? viewerDoubtSql(viewerId)
        : {
            id: sql<number | null>`null`.mapWith((v) => v),
            amount: sql<number | null>`null`.mapWith((v) => v),
            userAmount: sql<number>`0`.mapWith(Number),
            isUserDoubt: sql<boolean>`false`.mapWith(Boolean),
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
