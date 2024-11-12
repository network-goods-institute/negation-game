DROP MATERIALIZED VIEW "public"."point_favor_history";--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."point_favor_history" AS (with "all_events" as ((((select "id" as point_id, "created_at" as event_time, 'point_created' as event_type from "points") union (select "point_id" as point_id, "created_at" as event_time, 'endorsement_made' as event_type from "endorsements")) union (select "older_point_id" as point_id, "created_at" as event_time, 'negation_made' as event_type from "negations")) union (select "newer_point_id" as point_id, "created_at" as event_time, 'negation_made' as event_type from "negations")) select "all_events".point_id as "point_id", "all_events".event_time as "event_time", 
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
       as "negations_cred" from "all_events" order by "all_events".point_id, "all_events".event_time);