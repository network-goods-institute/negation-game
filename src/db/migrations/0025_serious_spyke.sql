DROP VIEW "public"."point_favor_history";--> statement-breakpoint
CREATE VIEW "public"."point_favor_history" AS (with "all_events" as ((((((select "id" as point_id, "created_at" as event_time, 'point_created' as event_type from "points") union (select "point_id" as point_id, "created_at" as event_time, 'endorsement_made' as event_type from "endorsements")) union (select "older_point_id" as point_id, "created_at" as event_time, 'negation_made' as event_type from "negations")) union (select "newer_point_id" as point_id, "created_at" as event_time, 'negation_made' as event_type from "negations")) union (select CASE 
              WHEN "negations"."older_point_id" = "endorsements"."point_id" 
              THEN "negations"."newer_point_id"
              ELSE "negations"."older_point_id"
            END as point_id, "endorsements"."created_at" as event_time, 'negation_endorsed' as event_type from "endorsements" left join "negations" on (
              ("negations"."older_point_id" = "endorsements"."point_id" OR 
               "negations"."newer_point_id" = "endorsements"."point_id")
              AND "negations"."created_at" <= "endorsements"."created_at"
            ))) union (select "id" as point_id, NOW() as event_time, 'favor_queried' as event_type from "points")) select "all_events_with_stats".point_id as "point_id", "all_events_with_stats".event_type as "event_type", "all_events_with_stats".event_time as "event_time", "all_events_with_stats".cred as "cred", "all_events_with_stats".negations_cred as "negations_cred", CAST(
            CASE
                WHEN "all_events_with_stats".cred = 0 THEN 0
                WHEN "all_events_with_stats".negations_cred = 0 THEN 100
                ELSE ROUND(100.0 * "all_events_with_stats".cred / ("all_events_with_stats".cred + "all_events_with_stats".negations_cred), 2)
            END
        AS NUMERIC) as "favor" from (select "all_events".point_id as "point_id", "all_events".event_type as "event_type", "all_events".event_time as "event_time", 
          COALESCE((
            SELECT SUM("cred")
            FROM "endorsements"
            WHERE "point_id" = "all_events".point_id
            AND "created_at" <= "all_events".event_time
          ), 0)
         as "cred", 
          COALESCE((
            SELECT SUM("cred")
            FROM "endorsements"
            WHERE "point_id" IN (
              SELECT newer_point_id
              FROM "negations"
              WHERE older_point_id = "all_events".point_id
              AND "created_at" <= "all_events".event_time
              UNION
              SELECT older_point_id
              FROM "negations"
              WHERE newer_point_id = "all_events".point_id
              AND "created_at" <= "all_events".event_time
            ) AND "created_at" <= "all_events".event_time
          ), 0)
         as "negations_cred" from "all_events") "all_events_with_stats" order by "all_events_with_stats".event_time, "all_events_with_stats".point_id);