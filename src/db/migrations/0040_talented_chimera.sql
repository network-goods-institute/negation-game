DROP VIEW IF EXISTS "public"."point_favor_history";
ALTER TABLE "doubts" ADD COLUMN "immutable" boolean DEFAULT true NOT NULL;
ALTER TABLE "public"."doubt_history" ALTER COLUMN "action" SET DATA TYPE text;
DROP TYPE IF EXISTS "public"."doubt_action";
CREATE TYPE "public"."doubt_action" AS ENUM('created', 'deactivated');
ALTER TABLE "public"."doubt_history" ALTER COLUMN "action" SET DATA TYPE "public"."doubt_action" USING (
  CASE 
    WHEN "action" IN ('increased', 'decreased') THEN 'deactivated'
    ELSE "action"
  END
)::"public"."doubt_action";
CREATE VIEW "public"."point_favor_history" AS 
WITH "all_events" AS (
  SELECT id as point_id, created_at as event_time, 'point_created'::text as event_type
  FROM points
  UNION ALL
  SELECT point_id, created_at as event_time, 'endorsement_made'::text as event_type
  FROM endorsements
  UNION ALL
  SELECT older_point_id as point_id, created_at as event_time, 'negation_made'::text as event_type
  FROM negations
  UNION ALL
  SELECT newer_point_id as point_id, created_at as event_time, 'negation_made'::text as event_type
  FROM negations
  UNION ALL
  SELECT 
    CASE 
      WHEN n.older_point_id = e.point_id THEN n.newer_point_id
      ELSE n.older_point_id
    END as point_id,
    e.created_at as event_time,
    'negation_endorsed'::text as event_type
  FROM endorsements e
  LEFT JOIN negations n ON (
    (n.older_point_id = e.point_id OR n.newer_point_id = e.point_id)
    AND n.created_at <= e.created_at
  )
  UNION ALL
  SELECT r.point_id, rh.created_at as event_time, 'restake_modified'::text as event_type
  FROM restake_history rh
  JOIN restakes r ON rh.restake_id = r.id
  UNION ALL
  SELECT r.point_id, sh.created_at as event_time, 'slash_modified'::text as event_type
  FROM slash_history sh
  JOIN slashes s ON sh.slash_id = s.id
  JOIN restakes r ON s.restake_id = r.id
  UNION ALL
  SELECT id as point_id, NOW() as event_time, 'favor_queried'::text as event_type
  FROM points
  UNION ALL
  SELECT d.point_id, dh.created_at as event_time, 'doubt_modified'::text as event_type
  FROM doubt_history dh
  JOIN doubts d ON dh.doubt_id = d.id
),
"all_events_with_stats" AS (
  SELECT 
    all_events.point_id,
    all_events.event_type,
    all_events.event_time,
    COALESCE((
      SELECT SUM(cred)
      FROM endorsements
      WHERE point_id = all_events.point_id
      AND created_at <= all_events.event_time
    ), 0) as cred,
    COALESCE((
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
    ), 0) as negations_cred
  FROM all_events
)
SELECT 
  point_id,
  event_type,
  event_time,
  cred,
  negations_cred,
  FLOOR(
        CASE
          WHEN cred = 0 THEN 0
          WHEN negations_cred = 0 THEN 100
          ELSE ROUND(100.0 * cred / (cred + negations_cred), 2) +
            COALESCE(
              CASE event_type
                WHEN 'restake_modified' THEN (
                  SELECT FLOOR(rh.new_amount - COALESCE((
                    SELECT sh.new_amount
                    FROM "slash_history" sh
                    JOIN "slashes" s ON s.id = sh.slash_id
                    WHERE s.restake_id = r.id
                    AND sh.created_at <= all_events_with_stats.event_time
                    ORDER BY sh.created_at DESC
                    LIMIT 1
                  ), 0))
                  FROM "restake_history" rh
                  JOIN "restakes" r ON r.id = rh.restake_id
                  WHERE r.point_id = all_events_with_stats.point_id
                  AND rh.created_at = all_events_with_stats.event_time
                )
                WHEN 'slash_modified' THEN (
                  SELECT FLOOR(r.amount - sh.new_amount)
                  FROM "slash_history" sh
                  JOIN "slashes" s ON s.id = sh.slash_id
                  JOIN "restakes" r ON r.id = s.restake_id
                  WHERE r.point_id = all_events_with_stats.point_id
                  AND sh.created_at = all_events_with_stats.event_time
                )
                WHEN 'doubt_modified' THEN (
                  SELECT FLOOR(rh.new_amount - COALESCE((
                    SELECT sh.new_amount
                    FROM "slash_history" sh
                    JOIN "slashes" s ON s.id = sh.slash_id
                    WHERE s.restake_id = r.id
                    AND sh.created_at <= all_events_with_stats.event_time
                    ORDER BY sh.created_at DESC
                    LIMIT 1
                  ), 0))
                  FROM "doubt_history" dh
                  JOIN "doubts" d ON d.id = dh.doubt_id
                  JOIN "restakes" r ON r.point_id = d.point_id
                  JOIN "restake_history" rh ON rh.restake_id = r.id
                  WHERE d.point_id = all_events_with_stats.point_id
                  AND dh.created_at = all_events_with_stats.event_time
                  ORDER BY rh.created_at DESC
                  LIMIT 1
                )
                ELSE (
                  SELECT GREATEST(0, FLOOR(rh.new_amount - COALESCE((
                    SELECT sh.new_amount
                    FROM "slash_history" sh
                    JOIN "slashes" s ON s.id = sh.slash_id
                    WHERE s.restake_id = r.id
                    AND sh.created_at <= all_events_with_stats.event_time
                    ORDER BY sh.created_at DESC
                    LIMIT 1
                  ), 0) - COALESCE((
                    SELECT SUM(d.amount)
                    FROM "doubts" d
                    WHERE d.point_id = r.point_id
                    AND d.negation_id = r.negation_id
                  ), 0)))
                  FROM "restake_history" rh
                  JOIN "restakes" r ON r.id = rh.restake_id
                  WHERE r.point_id = all_events_with_stats.point_id
                  AND rh.created_at <= all_events_with_stats.event_time
                  ORDER BY rh.created_at DESC
                  LIMIT 1
                )
              END,
              0
            )
        END
      ) as "favor"
FROM all_events_with_stats 
ORDER BY event_time, point_id;