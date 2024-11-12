DROP VIEW "public"."point_counterpoints_join_view";--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."point_favor_history" AS (with "all_events" as ((((select "id" as point_id, "created_at" as event_time from "points") union (select "point_id" as point_id, "created_at" as event_time from "endorsements")) union (select "older_point_id" as point_id, "created_at" as event_time from "negations")) union (select "newer_point_id" as point_id, "created_at" as event_time from "negations")) select "all_events".point_id as "point_id", "all_events".event_time as "event_time", 
          COALESCE((
            SELECT SUM("cred")
            FROM "endorsements" AS "e"
            WHERE "e"."point_id" = "all_events".point_id
            AND "e"."created_at" <= "all_events".event_time
          ), 0)
         as "point_cred", 
          COALESCE((
            SELECT SUM("cred")
            FROM "endorsements" AS "e"
            JOIN "negations" AS "n" ON (
              "e"."point_id" IN (
                "n"."newer_point_id", 
                "n"."older_point_id"
              )
            )
            WHERE 
              "n"."created_at" <= "all_events".event_time
              AND "e"."created_at" <= "all_events".event_time
              AND (
                ("n"."older_point_id" = "all_events".point_id)
                OR 
                ("n"."newer_point_id" = "all_events".point_id)
              )
          ), 0)
         as "negations_cred", 
          CASE 
            WHEN (
              COALESCE((
                SELECT SUM("cred")
                FROM "endorsements" AS "e"
                WHERE "e"."point_id" = "all_events".point_id
                AND "e"."created_at" <= "all_events".event_time
              ), 0) +
              COALESCE((
                SELECT SUM("cred")
                FROM "endorsements" AS "e"
                JOIN "negations" AS "n" ON (
                  "e"."point_id" IN (
                    "n"."newer_point_id", 
                    "n"."older_point_id"
                  )
                )
                WHERE 
                  "n"."created_at" <= "all_events".event_time
                  AND "e"."created_at" <= "all_events".event_time
                  AND (
                    ("n"."older_point_id" = "all_events".point_id)
                    OR 
                    ("n"."newer_point_id" = "all_events".point_id)
                  )
              ), 0)
            ) = 0 THEN 0
            ELSE ROUND(
              COALESCE((
                SELECT SUM("cred")
                FROM "endorsements" AS "e"
                WHERE "e"."point_id" = "all_events".point_id
                AND "e"."created_at" <= "all_events".event_time
              ), 0)::numeric /
              (
                COALESCE((
                  SELECT SUM("cred")
                  FROM "endorsements" AS "e"
                  WHERE "e"."point_id" = "all_events".point_id
                  AND "e"."created_at" <= "all_events".event_time
                ), 0) +
                COALESCE((
                  SELECT SUM("cred")
                  FROM "endorsements" AS "e"
                  JOIN "negations" AS "n" ON (
                    "e"."point_id" IN (
                      "n"."newer_point_id", 
                      "n"."older_point_id"
                    )
                  )
                  WHERE 
                    "n"."created_at" <= "all_events".event_time
                    AND "e"."created_at" <= "all_events".event_time
                    AND (
                      ("n"."older_point_id" = "all_events".point_id)
                      OR 
                      ("n"."newer_point_id" = "all_events".point_id)
                    )
                ), 0)
              )::numeric,
              4
            )
          END
         as "favor" from "all_events" order by "all_events".point_id, "all_events".event_time);