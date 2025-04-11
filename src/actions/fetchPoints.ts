"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import {
  pointsWithDetailsView,
  effectiveRestakesView,
  slashesTable,
  doubtsTable,
  spacesTable,
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  viewerCredSql,
  totalRestakeAmountSql,
  restakesByPointSql,
  slashedAmountSql,
  doubtedAmountSql,
  viewerDoubtSql,
} from "./utils/pointSqlUtils";

export const fetchPoints = async (ids: number[]) => {
  const viewerId = await getUserId();
  const space = await getSpace();

  // Get the space's pinnedPointId
  const spaceDetails = await db.query.spacesTable.findFirst({
    where: eq(spacesTable.id, space),
    columns: {
      pinnedPointId: true,
    },
  });

  const pinnedPointId = spaceDetails?.pinnedPointId;

  // Find the command point that pinned this point with the highest favor
  const commandPoint = await db.execute(
    sql`
    WITH command_points AS (
      SELECT 
        p.*,
        COALESCE(SUM(e.cred), 0) as total_cred,
        COALESCE(
          (
            SELECT SUM(e2.cred)
            FROM endorsements e2
            JOIN points p2 ON p2.id = e2.point_id
            WHERE p2.id IN (
              SELECT newer_point_id FROM negations WHERE older_point_id = p.id
              UNION
              SELECT older_point_id FROM negations WHERE newer_point_id = p.id
            )
          ),
          0
        ) as negations_cred
      FROM points p
      LEFT JOIN endorsements e ON p.id = e.point_id
      WHERE p.is_command = true 
      AND p.space = ${space}
      AND p.content LIKE ${`/pin %`}
      GROUP BY p.id
    )
    SELECT 
      cp.*,
      CASE
        WHEN total_cred = 0 THEN 0
        WHEN negations_cred = 0 THEN 100
        ELSE FLOOR(100.0 * total_cred / (total_cred + negations_cred))
      END as favor
    FROM command_points cp
    ORDER BY favor DESC, created_at DESC
    LIMIT 1
  `
  );

  const highestFavorCommand = commandPoint.length > 0 ? commandPoint[0] : null;

  return await db
    .select({
      ...getColumns(pointsWithDetailsView),
      isPinned:
        sql<boolean>`${pointsWithDetailsView.pointId} = ${pinnedPointId || 0}`.mapWith(
          Boolean
        ),
      isCommand: pointsWithDetailsView.isCommand,
      pinnedByCommandId: sql<number | null>`CASE 
        WHEN ${pointsWithDetailsView.pointId} = ${pinnedPointId || 0} 
        THEN ${highestFavorCommand?.id || null}
        ELSE NULL
      END`.mapWith((val) => val),
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
    .where(
      and(
        inArray(pointsWithDetailsView.pointId, ids),
        eq(pointsWithDetailsView.space, space)
      )
    )
    .then((points) => {
      return addFavor(points);
    });
};
