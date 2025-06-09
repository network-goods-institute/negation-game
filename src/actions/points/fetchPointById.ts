"use server";

import { getUserId } from "@/actions/users/getUserId";
import {
  pointsWithDetailsView,
  effectiveRestakesView,
  slashesTable,
  doubtsTable,
  endorsementsTable,
  negationsTable,
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { and, eq, sql } from "drizzle-orm";
import {
  viewerCredSql,
  totalRestakeAmountSql,
  restakesByPointSql,
  slashedAmountSql,
  doubtedAmountSql,
  viewerDoubtSql,
} from "@/actions/utils/pointSqlUtils";
import { PointData } from "@/queries/points/usePointData";

export const fetchPointById = async (
  pointId: number
): Promise<PointData | null> => {
  const viewerId = await getUserId();

  const results = await db
    .select({
      ...getColumns(pointsWithDetailsView),
      isPinned: sql<boolean>`false`.mapWith(Boolean),
      isCommand: pointsWithDetailsView.isCommand,
      pinnedByCommandId: sql<number | null>`null`.mapWith((val) => val),
      viewerCred: viewerCredSql(viewerId),
      viewerNegationsCred: viewerId
        ? sql<number>`
            COALESCE((
              SELECT SUM(${endorsementsTable.cred})
              FROM ${endorsementsTable}
              WHERE ${endorsementsTable.userId} = ${viewerId}
                AND ${endorsementsTable.pointId} IN (
                  SELECT older_point_id FROM ${negationsTable} WHERE newer_point_id = ${pointsWithDetailsView.pointId}
                  UNION
                  SELECT newer_point_id FROM ${negationsTable} WHERE older_point_id = ${pointsWithDetailsView.pointId}
                )
            ), 0)
          `.mapWith(Number)
        : sql<number>`0`.mapWith(Number),
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
      ...(viewerId
        ? {
            restake: {
              id: effectiveRestakesView.pointId,
              amount: sql<number>`
                CASE
                  WHEN ${effectiveRestakesView.slashedAmount} >= ${effectiveRestakesView.amount} THEN 0
                  ELSE ${effectiveRestakesView.amount}
                END
              `.mapWith(Number),
              originalAmount: effectiveRestakesView.amount,
              slashedAmount: effectiveRestakesView.slashedAmount,
              doubtedAmount: effectiveRestakesView.doubtedAmount,
            },
            slash: {
              id: slashesTable.id,
              amount: slashesTable.amount,
            },
          }
        : {}),
    })
    .from(pointsWithDetailsView)
    .leftJoin(
      doubtsTable,
      and(
        eq(doubtsTable.pointId, pointsWithDetailsView.pointId),
        eq(doubtsTable.userId, viewerId ?? "")
      )
    )
    .leftJoin(
      effectiveRestakesView,
      and(
        eq(effectiveRestakesView.pointId, pointsWithDetailsView.pointId),
        eq(effectiveRestakesView.userId, viewerId ?? ""),
        sql`${effectiveRestakesView.slashedAmount} < ${effectiveRestakesView.amount}`
      )
    )
    .leftJoin(
      slashesTable,
      and(
        eq(slashesTable.pointId, pointsWithDetailsView.pointId),
        eq(slashesTable.userId, viewerId ?? "")
      )
    )
    .where(eq(pointsWithDetailsView.pointId, pointId))
    .then((points) => {
      return addFavor(points);
    });

  const processedPoint = results.length > 0 ? results[0] : null;

  if (!processedPoint) {
    return null;
  }

  return processedPoint as PointData;
};
