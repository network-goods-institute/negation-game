"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
import {
  endorsementsTable,
  pointsWithDetailsView,
  effectiveRestakesView,
  doubtsTable,
  pointsTable,
  spacesTable,
  negationsTable,
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { Timestamp } from "@/types/Timestamp";
import { desc, eq, sql, and, ne } from "drizzle-orm";
import { decodeId } from "@/lib/negation-game/decodeId";
import { deduplicatePoints } from "@/db/utils/deduplicatePoints";

export type FeedPoint = {
  pointId: number;
  content: string;
  createdAt: Date;
  createdBy: string;
  cred: number;
  amountSupporters: number;
  amountNegations: number;
  negationsCred: number;
  space: string | null;
  viewerCred?: number;
  viewerNegationsCred?: number;
  negationIds: number[];
  restakesByPoint: number;
  slashedAmount: number;
  doubtedAmount: number;
  totalRestakeAmount: number;
  isCommand?: boolean;
  pinnedByCommandId?: number | null;
  favor: number;
  doubt?: {
    id: number;
    amount: number;
    userAmount: number;
    isUserDoubt: boolean;
  } | null;
  pinCommands?: Array<{
    id: number;
    favor: number;
    createdAt: Date;
  }>;
};

export const fetchFeedPage = async (olderThan?: Timestamp) => {
  const viewerId = await getUserId();
  const space = await getSpace();

  // Get the space's pinnedPointId - do this first to avoid a subquery in main query
  const spaceDetails = await db.query.spacesTable.findFirst({
    where: eq(spacesTable.id, space),
    columns: {
      pinnedPointId: true,
    },
  });

  const pinnedPointId = spaceDetails?.pinnedPointId;

  // Prepare base conditions
  const conditions = [eq(pointsWithDetailsView.space, space)];

  // Add timestamp condition if provided - use prepared parameter
  if (olderThan && !isNaN(Number(olderThan))) {
    const timestamp = new Date(Number(olderThan));
    if (!isNaN(timestamp.getTime())) {
      conditions.push(sql`${pointsWithDetailsView.createdAt} < ${timestamp}`);
    }
  }

  // Exclude pinned point to avoid duplication - use SQL operator for better performance
  if (pinnedPointId) {
    conditions.push(ne(pointsWithDetailsView.pointId, pinnedPointId));
  }

  // this is somehow producing duplicates
  // i have not been able to track it down, it seems to be related to pin commands
  // but i don't understand why
  const results = await db
    .selectDistinct({
      ...getColumns(pointsWithDetailsView),
      viewerCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId}
            AND ${endorsementsTable.userId} = ${viewerId || sql`NULL`}
        ), 0)
      `.mapWith(Number),
      viewerNegationsCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.userId} = ${viewerId || sql`NULL`}
            AND ${endorsementsTable.pointId} IN (
              SELECT older_point_id FROM ${negationsTable}
              WHERE newer_point_id = ${pointsWithDetailsView.pointId}
              UNION
              SELECT newer_point_id FROM ${negationsTable}
              WHERE older_point_id = ${pointsWithDetailsView.pointId}
            )
        ), 0)
      `.mapWith(Number),
      restakesByPoint: sql<number>`
        COALESCE(
          (SELECT SUM(CASE WHEN ${viewerId ? sql`er1.user_id = ${viewerId}` : sql`FALSE`} THEN er1.amount ELSE 0 END)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}
           AND er1.slashed_amount < er1.amount), 
          0
        )
      `.mapWith(Number),
      slashedAmount: sql<number>`
        COALESCE(
          (SELECT SUM(CASE WHEN ${viewerId ? sql`er1.user_id = ${viewerId}` : sql`FALSE`} THEN er1.slashed_amount ELSE 0 END)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}), 
          0
        )
      `.mapWith(Number),
      doubtedAmount: sql<number>`
        COALESCE(
          (SELECT SUM(CASE WHEN ${viewerId ? sql`er1.user_id = ${viewerId}` : sql`FALSE`} THEN er1.doubted_amount ELSE 0 END)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}), 
          0
        )
      `.mapWith(Number),
      totalRestakeAmount: sql<number>`
        COALESCE((
          SELECT SUM(CASE 
            WHEN er.slashed_amount >= er.amount THEN 0
            ELSE er.amount
          END)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointsWithDetailsView.pointId}
          AND er.negation_id = ANY(${pointsWithDetailsView.negationIds})
        ), 0)
      `
        .mapWith(Number)
        .as("total_restake_amount"),
      pinnedByCommandId: sql<number | null>`
        COALESCE((
          SELECT p.id
          FROM ${pointsTable} p
          WHERE p.is_command = true 
          AND p.space = ${space}
          AND p.content LIKE '/pin %'
          ORDER BY p.created_at DESC
          LIMIT 1
        ), NULL)
      `.mapWith((x) => x as number | null),
      doubt: viewerId
        ? {
            id: doubtsTable.id,
            amount: doubtsTable.amount,
            userAmount: doubtsTable.amount,
            isUserDoubt: sql<boolean>`${doubtsTable.userId} = ${viewerId}`.as(
              "is_user_doubt"
            ),
          }
        : sql<null>`NULL`.mapWith((x) => x as null),
    })
    .from(pointsWithDetailsView)
    .where(and(...conditions))
    .leftJoin(
      doubtsTable,
      viewerId
        ? and(
            eq(doubtsTable.pointId, pointsWithDetailsView.pointId),
            eq(doubtsTable.userId, viewerId)
          )
        : sql`false`
    )
    .orderBy(desc(pointsWithDetailsView.createdAt));

  // Get all pin commands with the highest favor
  const commandPoints = await db.execute(
    sql`
    WITH RECURSIVE command_points AS (
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
        ) as negations_cred,
        COALESCE((
          SELECT SUM(rh.new_amount)
          FROM restake_history rh
          JOIN restakes r ON r.id = rh.restake_id
          WHERE r.point_id = p.id
        ), 0) as total_restakes,
        COALESCE((
          SELECT SUM(
            LEAST(
              dh.new_amount,
              (
                SELECT COALESCE(SUM(rh2.new_amount), 0)
                FROM restake_history rh2
                JOIN restakes r2 ON r2.id = rh2.restake_id
                WHERE r2.point_id = p.id
                AND rh2.created_at <= dh.created_at
              )
            )
          )
          FROM doubt_history dh
          JOIN doubts d ON d.id = dh.doubt_id
          WHERE d.point_id = p.id
        ), 0)::integer as effective_doubts,
        COALESCE((
          SELECT SUM(sh.new_amount)
          FROM slash_history sh
          JOIN slashes s ON s.id = sh.slash_id
          JOIN restakes r ON r.id = s.restake_id
          WHERE r.point_id = p.id
        ), 0) as total_slashes,
        CASE 
          WHEN ARRAY_LENGTH(regexp_split_to_array(content, '\\s+'), 1) >= 2 
          THEN (regexp_split_to_array(content, '\\s+'))[2]
          ELSE NULL
        END as target_point_id_encoded
      FROM points p
      LEFT JOIN endorsements e ON p.id = e.point_id
      WHERE p.is_command = true 
      AND p.space = ${space}
      AND p.content LIKE ${`/pin %`}
      GROUP BY p.id
    ),
    command_points_with_favor AS (
      SELECT 
        cp.*,
        CASE
          WHEN total_cred = 0 THEN 0
          WHEN negations_cred = 0 THEN 100
          ELSE FLOOR(
            100.0 * total_cred / (total_cred + negations_cred)
          ) + GREATEST(0, 
            total_restakes - 
            GREATEST(
              effective_doubts,
              total_slashes
            )
          )
        END as favor
      FROM command_points cp
    ),
    highest_favor_commands AS (
      SELECT *
      FROM command_points_with_favor
      WHERE favor = (
        SELECT MAX(favor)
        FROM command_points_with_favor
      )
      ORDER BY created_at DESC
    )
    SELECT id, favor, created_at as "createdAt", target_point_id_encoded as "targetPointIdEncoded"
    FROM highest_favor_commands
    `
  );

  // Convert all encoded IDs to numerical IDs
  const highestFavorCommands =
    commandPoints.length > 0
      ? await Promise.all(
          commandPoints.map(async (cmd: any) => {
            let targetPointId = null;
            if (cmd.targetPointIdEncoded) {
              try {
                // Try to decode as an encoded ID
                targetPointId = decodeId(cmd.targetPointIdEncoded);
              } catch (e) {
                // If decoding fails, check if it's already a number
                const parsedId = parseInt(cmd.targetPointIdEncoded, 10);
                if (!isNaN(parsedId)) {
                  targetPointId = parsedId;
                }
              }
            }

            return {
              id: cmd.id,
              favor: cmd.favor,
              createdAt: cmd.createdAt,
              targetPointId,
            };
          })
        )
      : [];

  const uniquePoints = deduplicatePoints(results);

  // Add pinCommands array to each point
  const pointsWithCommandsInit = uniquePoints.map((point) => ({
    ...point,
    pinCommands: [] as Array<{
      id: number;
      favor: number;
      createdAt: Date;
      targetPointId: number | null;
    }>,
  }));

  // Add commands to points
  highestFavorCommands.forEach((cmd) => {
    if (cmd.targetPointId) {
      const point = pointsWithCommandsInit.find(
        (p) => p.pointId === cmd.targetPointId
      );
      if (point) {
        point.pinCommands.push(cmd);
      }
    }
  });

  // Clean up empty pinCommands
  const pointsWithCommands = pointsWithCommandsInit.map((point) => ({
    ...point,
    pinCommands: point.pinCommands.length > 0 ? point.pinCommands : undefined,
  }));

  return await addFavor(pointsWithCommands);
};
