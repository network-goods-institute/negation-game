"use server";

import { getUserId } from "@/actions/getUserId";
import { db } from "@/services/db";
import { spacesTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { addFavor } from "@/db/utils/addFavor";
import { FeedPoint } from "@/actions/fetchFeed";
import { decodeId } from "@/lib/decodeId";

export interface FetchPinnedPointParams {
  spaceId: string;
}

export async function fetchPinnedPoint({ spaceId }: FetchPinnedPointParams) {
  // Extra safety check - never show pinned points in global space
  if (spaceId === "global") {
    return null;
  }

  const userId = await getUserId();

  // First, get the pinnedPointId from the space
  const space = await db.query.spacesTable.findFirst({
    where: eq(spacesTable.id, spaceId),
    columns: {
      pinnedPointId: true,
    },
  });

  if (!space || !space.pinnedPointId) {
    return null;
  }

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
      AND p.space = ${spaceId}
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

  // Get the complete point data with favor, etc.
  const result = await db.execute(
    sql`
      WITH point_data AS (
        SELECT
          p.id as "pointId",
          p.content,
          p.created_at as "createdAt",
          p.created_by as "createdBy",
          p.space,
          p.is_command as "isCommand",
          COALESCE((
            SELECT SUM(e.cred)
            FROM endorsements e
            WHERE e.point_id = p.id
          ), 0) as cred,
          COUNT(DISTINCT e.user_id) as "amountSupporters",
          COUNT(DISTINCT n.id) as "amountNegations",
          COALESCE((
            SELECT SUM(e2.cred)
            FROM endorsements e2
            JOIN points p2 ON p2.id = e2.point_id
            WHERE p2.id IN (
              SELECT newer_point_id FROM negations WHERE older_point_id = p.id
              UNION
              SELECT older_point_id FROM negations WHERE newer_point_id = p.id
            )
          ), 0) as "negationsCred",
          COALESCE((SELECT e2.cred FROM endorsements e2 WHERE e2.point_id = p.id AND e2.user_id = ${userId || null} LIMIT 1), 0) as "viewerCred",
          ARRAY_AGG(DISTINCT n.id) FILTER (WHERE n.id IS NOT NULL) as "negationIds",
          COALESCE(SUM(CASE WHEN r.user_id = ${userId || null} THEN er.effective_amount ELSE 0 END), 0) as "restakesByPoint",
          COALESCE(SUM(CASE WHEN r.user_id = ${userId || null} THEN er.slashed_amount ELSE 0 END), 0) as "slashedAmount",
          COALESCE(SUM(CASE WHEN d.user_id = ${userId || null} THEN d.amount ELSE 0 END), 0) as "doubtedAmount",
          COALESCE(SUM(er.effective_amount), 0) as "totalRestakeAmount"
        FROM points p
        LEFT JOIN endorsements e ON p.id = e.point_id
        LEFT JOIN negations n ON (p.id = n.older_point_id OR p.id = n.newer_point_id)
        LEFT JOIN restakes r ON (p.id = r.negation_id)
        LEFT JOIN doubts d ON (r.point_id = d.point_id AND r.negation_id = d.negation_id)
        LEFT JOIN effective_restakes_view er ON (r.point_id = er.point_id AND r.negation_id = er.negation_id AND r.user_id = er.user_id)
        WHERE p.id = ${space.pinnedPointId}
        GROUP BY p.id
      ),
      doubt_data AS (
        SELECT 
          MIN(d.id) as id,
          COALESCE(SUM(d.amount), 0) as amount,
          COALESCE(SUM(CASE WHEN d.user_id = ${userId || null} THEN d.amount ELSE 0 END), 0) as "userAmount",
          CASE WHEN COUNT(CASE WHEN d.user_id = ${userId || null} THEN 1 END) > 0 THEN true ELSE false END as "isUserDoubt"
        FROM doubts d
        JOIN point_data pd ON pd."pointId" = d.point_id
        JOIN negations n ON (n.older_point_id = pd."pointId" OR n.newer_point_id = pd."pointId")
        WHERE d.negation_id = n.id
        GROUP BY d.point_id, d.negation_id
      )
      SELECT 
        pd.*,
        dd.id as "doubtId",
        dd.amount as "doubtAmount",
        dd."userAmount" as "doubtUserAmount",
        dd."isUserDoubt",
        ${
          highestFavorCommands.length > 0
            ? sql`jsonb_agg(
          jsonb_build_object(
            'id', cmd.id,
            'favor', cmd.favor,
            'createdAt', cmd.createdAt,
            'targetPointId', cmd.targetPointId
          )
        )`
            : "NULL"
        } as "pinCommands"
      FROM point_data pd
      LEFT JOIN doubt_data dd ON true
      CROSS JOIN (
        SELECT id, favor, createdAt, targetPointId
        FROM json_to_recordset(${JSON.stringify(highestFavorCommands)}::json)
        AS cmd(id int, favor int, createdAt timestamp, targetPointId int)
      ) cmd
      GROUP BY 
        pd."pointId", pd.content, pd."createdAt", pd."createdBy", pd.space,
        pd."isCommand", pd.cred, pd."amountSupporters", pd."amountNegations",
        pd."negationsCred", pd."viewerCred", pd."negationIds", pd."restakesByPoint",
        pd."slashedAmount", pd."doubtedAmount", pd."totalRestakeAmount",
        dd.id, dd.amount, dd."userAmount", dd."isUserDoubt"
    `
  );

  // Extract the results
  const points = result as unknown as Array<
    FeedPoint & {
      pinnedByCommandId: number | null;
      pinCommands: Array<{
        id: number;
        favor: number;
        createdAt: Date;
        targetPointId: number | null;
      }>;
    }
  >;

  if (!points || points.length === 0) {
    return null;
  }

  const pointsWithFavor = await addFavor(points);

  return pointsWithFavor[0];
}
