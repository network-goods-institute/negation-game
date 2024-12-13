import { endorsementsTable, negationsTable, pointsTable, restakesTable, restakeHistoryTable, slashesTable, slashHistoryTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";

export type PointFavorHistoryViewEventType = 
  | "point_created" 
  | "endorsement_made" 
  | "negation_made" 
  | "negation_endorsed" 
  | "restake_modified"
  | "slash_modified"
  | "favor_queried";

export const pointFavorHistoryView = pgView("point_favor_history").as((qb) => {
  const allEvents = qb.$with("all_events").as(
    qb
      .select({
        point_id: sql`${pointsTable.id} as point_id`,
        event_time: sql`${pointsTable.createdAt} as event_time`,
        event_type: sql<PointFavorHistoryViewEventType>`'point_created' as event_type`,
      })
      .from(pointsTable)
      .union(
        qb
          .select({
            point_id: sql`${endorsementsTable.pointId} as point_id`,
            event_time: sql`${endorsementsTable.createdAt} as event_time`,
            event_type: sql<PointFavorHistoryViewEventType>`'endorsement_made' as event_type`,
          })
          .from(endorsementsTable)
      )
      .union(
        qb
          .select({
            point_id: sql`${negationsTable.olderPointId} as point_id`,
            event_time: sql`${negationsTable.createdAt} as event_time`,
            event_type: sql<PointFavorHistoryViewEventType>`'negation_made' as event_type`,
          })
          .from(negationsTable)
      )
      .union(
        qb
          .select({
            point_id: sql`${negationsTable.newerPointId} as point_id`,
            event_time: sql`${negationsTable.createdAt} as event_time`,
            event_type: sql<PointFavorHistoryViewEventType>`'negation_made' as event_type`,
          })
          .from(negationsTable)
      )
      .union(
        qb
          .select({
            point_id: sql`CASE 
              WHEN ${negationsTable.olderPointId} = ${endorsementsTable.pointId} 
              THEN ${negationsTable.newerPointId}
              ELSE ${negationsTable.olderPointId}
            END as point_id`,
            event_time: sql`${endorsementsTable.createdAt} as event_time`,
            event_type: sql<PointFavorHistoryViewEventType>`'negation_endorsed' as event_type`,
          })
          .from(endorsementsTable)
          .leftJoin(
            negationsTable,
            sql`(
              (${negationsTable.olderPointId} = ${endorsementsTable.pointId} OR 
               ${negationsTable.newerPointId} = ${endorsementsTable.pointId})
              AND ${negationsTable.createdAt} <= ${endorsementsTable.createdAt}
            )`
          )
      )
      .union(
        qb
          .select({
            point_id: sql`${restakesTable.pointId} as point_id`,
            event_time: sql`${restakeHistoryTable.createdAt} as event_time`,
            event_type: sql<PointFavorHistoryViewEventType>`'restake_modified' as event_type`,
          })
          .from(restakeHistoryTable)
          .innerJoin(restakesTable, sql`${restakeHistoryTable.restakeId} = ${restakesTable.id}`)
      )
      .union(
        qb
          .select({
            point_id: sql`${restakesTable.pointId} as point_id`,
            event_time: sql`${slashHistoryTable.createdAt} as event_time`,
            event_type: sql<PointFavorHistoryViewEventType>`'slash_modified' as event_type`,
          })
          .from(slashHistoryTable)
          .innerJoin(slashesTable, sql`${slashHistoryTable.slashId} = ${slashesTable.id}`)
          .innerJoin(restakesTable, sql`${slashesTable.restakeId} = ${restakesTable.id}`)
      )
      .union(
        qb
          .select({
            point_id: sql`${pointsTable.id} as point_id`,
            event_time: sql`NOW() as event_time`,
            event_type: sql<PointFavorHistoryViewEventType>`'favor_queried' as event_type`,
          })
          .from(pointsTable)
      )
  );

  return qb
    .with(allEvents)
    .select({
      pointId: sql`"all_events_with_stats".point_id`.as("point_id"),
      event_type: sql<PointFavorHistoryViewEventType>`"all_events_with_stats".event_type`.as("event_type"),
      eventTime: sql`"all_events_with_stats".event_time`
        .mapWith(Date.parse)
        .as("event_time"),
      cred: sql`"all_events_with_stats".cred`.as("cred"),
      negationsCred: sql`"all_events_with_stats".negations_cred`.as("negations_cred"),
      favor: sql<number>`CAST(
        CASE
          WHEN "all_events_with_stats"."cred" = 0 THEN 0
          WHEN "all_events_with_stats"."negations_cred" = 0 THEN 100
          ELSE ROUND(100.0 * "all_events_with_stats"."cred" / ("all_events_with_stats"."cred" + "all_events_with_stats"."negations_cred"), 2) +
            COALESCE(
              CASE "all_events_with_stats"."event_type"
                WHEN 'restake_modified' THEN (
                  SELECT rh.new_amount - COALESCE((
                    SELECT sh.new_amount
                    FROM ${slashHistoryTable} sh
                    JOIN ${slashesTable} s ON s.id = sh.slash_id
                    WHERE s.restake_id = r.id
                    AND sh.created_at <= "all_events_with_stats"."event_time"
                    ORDER BY sh.created_at DESC
                    LIMIT 1
                  ), 0)
                  FROM ${restakeHistoryTable} rh
                  JOIN ${restakesTable} r ON r.id = rh.restake_id
                  WHERE r.point_id = "all_events_with_stats"."point_id"
                  AND rh.created_at = "all_events_with_stats"."event_time"
                )
                WHEN 'slash_modified' THEN (
                  SELECT r.amount - sh.new_amount
                  FROM ${slashHistoryTable} sh
                  JOIN ${slashesTable} s ON s.id = sh.slash_id
                  JOIN ${restakesTable} r ON r.id = s.restake_id
                  WHERE r.point_id = "all_events_with_stats"."point_id"
                  AND sh.created_at = "all_events_with_stats"."event_time"
                )
                ELSE (
                  SELECT rh.new_amount - COALESCE((
                    SELECT sh.new_amount
                    FROM ${slashHistoryTable} sh
                    JOIN ${slashesTable} s ON s.id = sh.slash_id
                    WHERE s.restake_id = r.id
                    AND sh.created_at <= "all_events_with_stats"."event_time"
                    ORDER BY sh.created_at DESC
                    LIMIT 1
                  ), 0)
                  FROM ${restakeHistoryTable} rh
                  JOIN ${restakesTable} r ON r.id = rh.restake_id
                  WHERE r.point_id = "all_events_with_stats"."point_id"
                  AND rh.created_at <= "all_events_with_stats"."event_time"
                  ORDER BY rh.created_at DESC
                  LIMIT 1
                )
              END,
              0
            )
        END
      AS NUMERIC)`
        .mapWith(Number)
        .as("favor"),
    })
    .from(
      qb
        .select({
          pointId: sql`"all_events".point_id`.as("point_id"),
          event_type: sql<PointFavorHistoryViewEventType>`"all_events".event_type`.as("event_type"),
          eventTime: sql`"all_events".event_time`.as("event_time"),
          cred: sql<number>`
          COALESCE((
            SELECT SUM(${endorsementsTable.cred})
            FROM ${endorsementsTable}
            WHERE ${endorsementsTable.pointId} = "all_events".point_id
            AND ${endorsementsTable.createdAt} <= "all_events".event_time
          ), 0)
        `
            .mapWith(Number)
            .as("cred"),
          negationsCred: sql<number>`
          COALESCE((
            SELECT SUM(${endorsementsTable.cred})
            FROM ${endorsementsTable}
            WHERE ${endorsementsTable.pointId} IN (
              SELECT newer_point_id
              FROM ${negationsTable}
              WHERE older_point_id = "all_events".point_id
              AND ${negationsTable.createdAt} <= "all_events".event_time
              UNION
              SELECT older_point_id
              FROM ${negationsTable}
              WHERE newer_point_id = "all_events".point_id
              AND ${negationsTable.createdAt} <= "all_events".event_time
            ) AND ${endorsementsTable.createdAt} <= "all_events".event_time
          ), 0)
        `
            .mapWith(Number)
            .as("negations_cred"),
        })
        .from(allEvents)
        .as("all_events_with_stats")
    )
    .orderBy(
      sql`"all_events_with_stats".event_time`,
      sql`"all_events_with_stats".point_id`
    );
});
