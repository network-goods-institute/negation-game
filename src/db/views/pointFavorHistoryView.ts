import {
  endorsementsTable,
  negationsTable,
  pointsTable,
  restakesTable,
  restakeHistoryTable,
  slashesTable,
  slashHistoryTable,
  doubtsTable,
  doubtHistoryTable,
} from "@/db/schema";
import { sql } from "drizzle-orm";
import { pgView } from "drizzle-orm/pg-core";

export type PointFavorHistoryViewEventType =
  | "point_created"
  | "endorsement_made"
  | "negation_made"
  | "negation_endorsed"
  | "restake_modified"
  | "slash_modified"
  | "doubt_modified"
  | "favor_queried";

export const pointFavorHistoryView = pgView("point_favor_history").as((qb) => {
  const allEvents = qb.$with("all_events").as(
    qb
      .select({
        point_id: sql`id as point_id`,
        event_time: sql`created_at as event_time`,
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
          .innerJoin(
            restakesTable,
            sql`${restakeHistoryTable.restakeId} = ${restakesTable.id}`
          )
      )
      .union(
        qb
          .select({
            point_id: sql`${restakesTable.pointId} as point_id`,
            event_time: sql`${slashHistoryTable.createdAt} as event_time`,
            event_type: sql<PointFavorHistoryViewEventType>`'slash_modified' as event_type`,
          })
          .from(slashHistoryTable)
          .innerJoin(
            slashesTable,
            sql`${slashHistoryTable.slashId} = ${slashesTable.id}`
          )
          .innerJoin(
            restakesTable,
            sql`${slashesTable.restakeId} = ${restakesTable.id}`
          )
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
      .union(
        qb
          .select({
            point_id: sql`${doubtsTable.pointId} as point_id`,
            event_time: sql`${doubtHistoryTable.createdAt} as event_time`,
            event_type: sql<PointFavorHistoryViewEventType>`'doubt_modified' as event_type`,
          })
          .from(doubtHistoryTable)
          .innerJoin(
            doubtsTable,
            sql`${doubtHistoryTable.doubtId} = ${doubtsTable.id}`
          )
      )
  );

  const allEventsWithStats = qb.$with("all_events_with_stats").as(
    qb
      .select({
        point_id: sql`all_events.point_id`,
        event_type: sql`all_events.event_type`,
        event_time: sql`all_events.event_time`,
        cred: sql`COALESCE((
          SELECT SUM(cred)
          FROM endorsements
          WHERE point_id = all_events.point_id
          AND created_at <= all_events.event_time
        ), 0)`,
        negations_cred: sql`COALESCE((
          SELECT SUM(cred)
          FROM endorsements
          WHERE point_id IN (
            SELECT newer_point_id
            FROM negations
            WHERE older_point_id = all_events.point_id
            AND created_at <= all_events.event_time
            UNION
            SELECT older_point_id
            FROM negations
            WHERE newer_point_id = all_events.point_id
            AND created_at <= all_events.event_time
          )
          AND created_at <= all_events.event_time
        ), 0)`,
        total_restakes: sql`COALESCE((
          SELECT SUM(rh.new_amount)
          FROM ${restakeHistoryTable} rh
          JOIN ${restakesTable} r ON r.id = rh.restake_id
          WHERE r.point_id = all_events.point_id
          AND rh.created_at <= all_events.event_time
        ), 0)`,
        effective_doubts: sql<number>`COALESCE((
          SELECT SUM(
            LEAST(
              dh.new_amount,
              (
                SELECT COALESCE(SUM(rh2.new_amount), 0)
                FROM ${restakeHistoryTable} rh2
                JOIN ${restakesTable} r2 ON r2.id = rh2.restake_id
                WHERE r2.point_id = all_events.point_id
                AND rh2.created_at <= dh.created_at
              )
            )
          )
          FROM ${doubtHistoryTable} dh
          JOIN ${doubtsTable} d ON d.id = dh.doubt_id
          WHERE d.point_id = all_events.point_id
          AND dh.created_at <= all_events.event_time
        ), 0)::integer`.mapWith(Number),
        total_slashes: sql`COALESCE((
          SELECT SUM(sh.new_amount)
          FROM ${slashHistoryTable} sh
          JOIN ${slashesTable} s ON s.id = sh.slash_id
          JOIN ${restakesTable} r ON r.id = s.restake_id
          WHERE r.point_id = all_events.point_id
          AND sh.created_at <= all_events.event_time
        ), 0)`,
      })
      .from(allEvents)
  );

  return qb
    .select({
      pointId: sql<number>`all_events_with_stats.point_id`
        .mapWith(Number)
        .as("point_id"),
      eventType:
        sql<PointFavorHistoryViewEventType>`all_events_with_stats.event_type`
          .mapWith(String)
          .as("event_type"),
      eventTime: sql<Date>`all_events_with_stats.event_time`
        .mapWith(Date)
        .as("event_time"),
      cred: sql<number>`all_events_with_stats.cred`.mapWith(Number).as("cred"),
      negationsCred: sql<number>`all_events_with_stats.negations_cred`
        .mapWith(Number)
        .as("negations_cred"),
      favor: sql<number>`
        CASE
          WHEN all_events_with_stats.cred = 0 THEN 0
          WHEN all_events_with_stats.negations_cred = 0 THEN 100
          ELSE FLOOR(
            100.0 * all_events_with_stats.cred / 
            (all_events_with_stats.cred + all_events_with_stats.negations_cred)
          ) + GREATEST(0, 
            all_events_with_stats.total_restakes - 
            GREATEST(
              all_events_with_stats.effective_doubts,
              all_events_with_stats.total_slashes
            )
          )
        END::integer
      `
        .mapWith(Number)
        .as("favor"),
    })
    .from(allEventsWithStats)
    .orderBy(sql`event_time, point_id`);
});
