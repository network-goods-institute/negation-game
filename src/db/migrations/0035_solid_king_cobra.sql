DROP VIEW "public"."point_favor_history";--> statement-breakpoint
CREATE VIEW "public"."point_favor_history" AS 
WITH "all_events" AS (
  SELECT "id" as point_id, "created_at" as event_time, 'point_created' as event_type FROM "points"
  UNION
  SELECT "point_id", "created_at", 'endorsement_made' FROM "endorsements"
  UNION
  SELECT "older_point_id", "created_at", 'negation_made' FROM "negations"
  UNION
  SELECT "newer_point_id", "created_at", 'negation_made' FROM "negations"
  UNION
  SELECT 
    CASE 
      WHEN "negations"."older_point_id" = "endorsements"."point_id" 
      THEN "negations"."newer_point_id"
      ELSE "negations"."older_point_id"
    END, 
    "endorsements"."created_at", 
    'negation_endorsed' 
  FROM "endorsements" 
  LEFT JOIN "negations" ON (
    ("negations"."older_point_id" = "endorsements"."point_id" OR 
     "negations"."newer_point_id" = "endorsements"."point_id")
    AND "negations"."created_at" <= "endorsements"."created_at"
  )
  UNION
  SELECT r.point_id, rh.created_at, 'restake_modified'
  FROM "restake_history" rh
  INNER JOIN "restakes" r ON r.id = rh.restake_id
  UNION
  SELECT r.point_id, sh.created_at, 'slash_modified'
  FROM "slash_history" sh
  INNER JOIN "slashes" s ON s.id = sh.slash_id
  INNER JOIN "restakes" r ON r.id = s.restake_id
  UNION
  SELECT "id", NOW(), 'favor_queried' FROM "points"
)
SELECT 
  "all_events_with_stats"."point_id",
  "all_events_with_stats"."event_type",
  "all_events_with_stats"."event_time",
  "all_events_with_stats"."cred",
  "all_events_with_stats"."negations_cred",
  CAST(
    CASE
      WHEN "all_events_with_stats"."cred" = 0 THEN 0
      WHEN "all_events_with_stats"."negations_cred" = 0 THEN 100
      ELSE ROUND(100.0 * "all_events_with_stats"."cred" / ("all_events_with_stats"."cred" + "all_events_with_stats"."negations_cred"), 2) +
        COALESCE(
          CASE "all_events_with_stats"."event_type"
            WHEN 'restake_modified' THEN (
              SELECT rh.new_amount - COALESCE((
                SELECT sh.new_amount
                FROM "slash_history" sh
                JOIN "slashes" s ON s.id = sh.slash_id
                WHERE s.restake_id = r.id
                AND sh.created_at <= "all_events_with_stats"."event_time"
                ORDER BY sh.created_at DESC
                LIMIT 1
              ), 0)
              FROM "restake_history" rh
              JOIN "restakes" r ON r.id = rh.restake_id
              WHERE r.point_id = "all_events_with_stats"."point_id"
              AND rh.created_at = "all_events_with_stats"."event_time"
            )
            WHEN 'slash_modified' THEN (
              SELECT r.amount - sh.new_amount
              FROM "slash_history" sh
              JOIN "slashes" s ON s.id = sh.slash_id
              JOIN "restakes" r ON r.id = s.restake_id
              WHERE r.point_id = "all_events_with_stats"."point_id"
              AND sh.created_at = "all_events_with_stats"."event_time"
            )
            ELSE (
              SELECT rh.new_amount - COALESCE((
                SELECT sh.new_amount
                FROM "slash_history" sh
                JOIN "slashes" s ON s.id = sh.slash_id
                WHERE s.restake_id = r.id
                AND sh.created_at <= "all_events_with_stats"."event_time"
                ORDER BY sh.created_at DESC
                LIMIT 1
              ), 0)
              FROM "restake_history" rh
              JOIN "restakes" r ON r.id = rh.restake_id
              WHERE r.point_id = "all_events_with_stats"."point_id"
              AND rh.created_at <= "all_events_with_stats"."event_time"
              ORDER BY rh.created_at DESC
              LIMIT 1
            )
          END,
          0
        )
    END
  AS NUMERIC) as "favor"
FROM (
  SELECT 
    "all_events"."point_id",
    "all_events"."event_type",
    "all_events"."event_time",
    COALESCE((
      SELECT SUM("cred")
      FROM "endorsements"
      WHERE "point_id" = "all_events"."point_id"
      AND "created_at" <= "all_events"."event_time"
    ), 0) as "cred",
    COALESCE((
      SELECT SUM("cred")
      FROM "endorsements"
      WHERE "point_id" IN (
        SELECT newer_point_id
        FROM "negations"
        WHERE older_point_id = "all_events"."point_id"
        AND "created_at" <= "all_events"."event_time"
        UNION
        SELECT older_point_id
        FROM "negations"
        WHERE newer_point_id = "all_events"."point_id"
        AND "created_at" <= "all_events"."event_time"
      ) AND "created_at" <= "all_events"."event_time"
    ), 0) as "negations_cred"
  FROM "all_events"
) "all_events_with_stats"
ORDER BY "all_events_with_stats"."event_time", "all_events_with_stats"."point_id";