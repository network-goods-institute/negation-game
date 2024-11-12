DROP MATERIALIZED VIEW "public"."point_favor_history";--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."point_favor_history" AS (with "all_events" as (((((select "id" as point_id, "created_at" as event_time, 'point_created' as event_type from "points") union (select "point_id" as point_id, "created_at" as event_time, 'endorsement_made' as event_type from "endorsements")) union (select "older_point_id" as point_id, "created_at" as event_time, 'negation_made' as event_type from "negations")) union (select "newer_point_id" as point_id, "created_at" as event_time, 'negation_made' as event_type from "negations")) union (select CASE 
              WHEN "negations"."older_point_id" = "endorsements"."point_id" 
              THEN "negations"."newer_point_id"
              ELSE "negations"."older_point_id"
            END as point_id, "endorsements"."created_at" as event_time, 'negation_endorsed' as event_type from "endorsements" left join "negations" on (
              ("negations"."older_point_id" = "endorsements"."point_id" OR 
               "negations"."newer_point_id" = "endorsements"."point_id")
              AND "negations"."created_at" <= "endorsements"."created_at"
            ))) select "all_events".point_id as "point_id", "all_events".event_type as "event_type", "all_events".event_time as "event_time", 
        COALESCE((
          SELECT SUM("cred")
          FROM "endorsements" AS "e"
          WHERE "e"."point_id" = "all_events".point_id
          AND "e"."created_at" <= "all_events".event_time
        ), 0)
       as "point_cred", 
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
       as "negations_cred" from "all_events" order by "all_events".event_time, "all_events".point_id);