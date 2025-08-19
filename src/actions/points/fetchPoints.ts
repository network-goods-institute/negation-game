"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
import {
  pointsWithDetailsView,
  effectiveRestakesView,
  slashesTable,
  doubtsTable,
  spacesTable,
  endorsementsTable,
  negationsTable,
  objectionsTable,
} from "@/db/schema";
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
} from "@/actions/utils/pointSqlUtils";

export const fetchPoints = async (ids: number[]) => {
  const viewerId = await getUserId();
  const space = await getSpace();
  return fetchPointsWithSpace(ids, space, viewerId);
};

export const fetchPointsWithSpace = async (
  ids: number[],
  space: string,
  viewerId?: string | null
) => {
  const actualViewerId = viewerId || (await getUserId());
  const ENABLE_PINNED_PRIORITY =
    process.env.NEXT_PUBLIC_FEATURE_PINNED_AND_PRIORITY === "true" ||
    process.env.NODE_ENV === "test";

  // Get the space's pinnedPointId
  const spaceDetails = await db.query.spacesTable.findFirst({
    where: eq(spacesTable.id, space),
    columns: {
      pinnedPointId: true,
    },
  });

  const pinnedPointId = spaceDetails?.pinnedPointId;

  // Find the command point that pinned this point with the highest favor
  const commandPoint = ENABLE_PINNED_PRIORITY
    ? await db.execute(
        sql`
    WITH command_points AS (
      SELECT 
        p.*,
        COALESCE(SUM(e.cred), 0) as total_cred,
        COALESCE(
          (
            SELECT SUM(e2.cred)
            FROM endorsements e2
            JOIN points p2 ON p2.id = e2.point_id AND p2.is_active = true
            WHERE p2.id IN (
              SELECT newer_point_id FROM negations WHERE older_point_id = p.id AND is_active = true
              UNION
              SELECT older_point_id FROM negations WHERE newer_point_id = p.id AND is_active = true
            )
          ),
          0
        ) as negations_cred
      FROM points p
      LEFT JOIN endorsements e ON p.id = e.point_id
      WHERE p.is_command = true 
      AND p.space = ${space}
      AND p.content LIKE ${`/pin %`}
      AND p.is_active = true
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
      )
    : [];

  const highestFavorCommand =
    ENABLE_PINNED_PRIORITY && commandPoint.length > 0 ? commandPoint[0] : null;

  return await db
    .select({
      ...getColumns(pointsWithDetailsView),
      favor: sql<number>`COALESCE((
        SELECT "favor"
        FROM "current_point_favor" cpf
        WHERE cpf."id" = "point_with_details_view"."id"
      ), 0)`.mapWith(Number),
      isPinned: ENABLE_PINNED_PRIORITY
        ? sql<boolean>`${pointsWithDetailsView.pointId} = ${pinnedPointId || 0}`.mapWith(
            Boolean
          )
        : sql<boolean>`false`.mapWith(Boolean),
      isCommand: pointsWithDetailsView.isCommand,
      pinnedByCommandId: ENABLE_PINNED_PRIORITY
        ? sql<number | null>`CASE 
            WHEN ${pointsWithDetailsView.pointId} = ${pinnedPointId || 0} 
            THEN ${highestFavorCommand?.id || null}
            ELSE NULL
          END`.mapWith((val) => val)
        : sql<number | null>`NULL`.mapWith((val) => val),
      viewerCred: viewerCredSql(actualViewerId),
      viewerNegationsCred: actualViewerId
        ? sql<number>`
            COALESCE((
              SELECT SUM(${endorsementsTable.cred})
              FROM ${endorsementsTable}
              WHERE ${endorsementsTable.userId} = ${actualViewerId}
                AND ${endorsementsTable.pointId} IN (
                  SELECT older_point_id FROM ${negationsTable} WHERE newer_point_id = ${pointsWithDetailsView.pointId} AND ${negationsTable.isActive} = true
                  UNION
                  SELECT newer_point_id FROM ${negationsTable} WHERE older_point_id = ${pointsWithDetailsView.pointId} AND ${negationsTable.isActive} = true
                )
            ), 0)
          `.mapWith(Number)
        : sql<number>`0`.mapWith(Number),
      restakesByPoint: restakesByPointSql(pointsWithDetailsView),
      slashedAmount: slashedAmountSql(pointsWithDetailsView),
      doubtedAmount: doubtedAmountSql(pointsWithDetailsView),
      totalRestakeAmount: totalRestakeAmountSql,
      doubt: actualViewerId
        ? viewerDoubtSql(actualViewerId)
        : {
            id: sql<number | null>`null`.mapWith((v) => v),
            amount: sql<number | null>`null`.mapWith((v) => v),
            userAmount: sql<number>`0`.mapWith(Number),
            isUserDoubt: sql<boolean>`false`.mapWith(Boolean),
          },
      ...(actualViewerId
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
      isObjection: sql<boolean>`EXISTS (
        SELECT 1 FROM ${objectionsTable}
        WHERE ${objectionsTable.objectionPointId} = ${pointsWithDetailsView.pointId}
        AND ${objectionsTable.isActive} = true
      )`.mapWith(Boolean),
      objectionTargetId: sql<number | null>`(
        SELECT ${objectionsTable.targetPointId} FROM ${objectionsTable}
        WHERE ${objectionsTable.objectionPointId} = ${pointsWithDetailsView.pointId}
        AND ${objectionsTable.isActive} = true
        LIMIT 1
      )`.mapWith((v) => v),
      objectionContextId: sql<number | null>`(
        SELECT ${objectionsTable.contextPointId} FROM ${objectionsTable}
        WHERE ${objectionsTable.objectionPointId} = ${pointsWithDetailsView.pointId}
        AND ${objectionsTable.isActive} = true
        LIMIT 1
      )`.mapWith((v) => v),
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
    );
};
