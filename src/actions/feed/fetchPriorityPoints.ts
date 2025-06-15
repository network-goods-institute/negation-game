"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
import {
  endorsementsTable,
  pointsWithDetailsView,
  doubtsTable,
  currentPointFavorView,
} from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql, inArray } from "drizzle-orm";
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
  if (!viewerId) return [];

  const space = await getSpace();

  // First, get the basic endorsed points data
  const endorsedPointsData = await db
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
      endorsementCreatedAt: endorsementsTable.createdAt,
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

  if (endorsedPointsData.length === 0) return [];

  // Get current favor for all points in one query (super fast)
  const pointIds = endorsedPointsData.map((p) => p.pointId);
  const currentFavorData = await db
    .select({
      pointId: currentPointFavorView.pointId,
      favor: currentPointFavorView.favor,
      cred: currentPointFavorView.cred,
      negationsCred: currentPointFavorView.negationsCred,
    })
    .from(currentPointFavorView)
    .where(inArray(currentPointFavorView.pointId, pointIds));

  const favorMap = new Map(currentFavorData.map((f) => [f.pointId, f]));

  // Calculate endorsement favor using accurate favor calculation
  const pointsWithFavor = endorsedPointsData.map((point) => {
    const favorData = favorMap.get(point.pointId);
    const currentFavor = favorData?.favor ?? 0;

    // Use the accurate cred and negationsCred from currentPointFavorView
    const accurateCred = favorData?.cred ?? point.cred;
    const accurateNegationsCred =
      favorData?.negationsCred ?? point.negationsCred;

    // Calculate endorsement favor using the same logic as currentPointFavorView
    // but without restake bonus (since restakes didn't exist at endorsement time)
    const endorsementFavor =
      accurateCred === 0
        ? 0
        : accurateNegationsCred === 0
          ? 100
          : Math.floor(
              (100 * accurateCred) / (accurateCred + accurateNegationsCred)
            );

    return {
      ...point,
      favor: currentFavor,
      endorsementFavor,
    };
  });

  const uniquePoints = Array.from(
    new Map(pointsWithFavor.map((point) => [point.pointId, point])).values()
  );

  // Sort by favor improvement: current favor - endorsement favor
  const sortedPoints = uniquePoints
    .sort((a, b) => {
      const aValueChange = a.favor - a.endorsementFavor;
      const bValueChange = b.favor - b.endorsementFavor;
      return bValueChange - aValueChange;
    })
    .slice(0, limit);

  return sortedPoints;
};
