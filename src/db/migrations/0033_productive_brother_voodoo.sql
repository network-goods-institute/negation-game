DROP VIEW "public"."point_favor_history";--> statement-breakpoint
ALTER TABLE "doubts" DROP COLUMN IF EXISTS "immutable";--> statement-breakpoint
CREATE VIEW "public"."point_favor_history" AS 
WITH all_events AS (
  SELECT id as point_id, created_at as event_time, 'point_created'::text as event_type
  FROM points
  UNION ALL
  SELECT point_id, created_at, 'endorsement_made'
  FROM endorsements
  UNION ALL
  SELECT older_point_id, created_at, 'negation_made'
  FROM negations
  UNION ALL
  SELECT newer_point_id, created_at, 'negation_made'
  FROM negations
  UNION ALL
  SELECT restakes.point_id, restake_history.created_at, 'restake_modified'
  FROM restake_history
  JOIN restakes ON restakes.id = restake_history.restake_id
  UNION ALL
  SELECT restakes.point_id, slash_history.created_at, 'slash_modified'
  FROM slash_history
  JOIN slashes ON slashes.id = slash_history.slash_id
  JOIN restakes ON restakes.id = slashes.restake_id
  UNION ALL
  SELECT doubts.point_id, doubt_history.created_at, 'doubt_modified'
  FROM doubt_history
  JOIN doubts ON doubts.id = doubt_history.doubt_id
  UNION ALL
  SELECT id, NOW(), 'favor_queried'
  FROM points
)
SELECT 
  ae.point_id,
  ae.event_type,
  ae.event_time,
  COALESCE((
    SELECT SUM(cred)
    FROM endorsements
    WHERE point_id = ae.point_id
    AND created_at <= ae.event_time
  ), 0) as cred,
  COALESCE((
    SELECT SUM(cred)
    FROM endorsements
    WHERE point_id IN (
      SELECT newer_point_id FROM negations WHERE older_point_id = ae.point_id
      AND created_at <= ae.event_time
      UNION
      SELECT older_point_id FROM negations WHERE newer_point_id = ae.point_id
      AND created_at <= ae.event_time
    )
    AND created_at <= ae.event_time
  ), 0) as negations_cred,
  COALESCE((
    SELECT SUM(rh.new_amount)
    FROM restake_history rh
    JOIN restakes r ON r.id = rh.restake_id
    WHERE r.point_id = ae.point_id
    AND rh.created_at <= ae.event_time
  ), 0) as total_restakes,
  COALESCE((
    SELECT SUM(
      LEAST(
        dh.new_amount,
        (
          SELECT COALESCE(SUM(rh2.new_amount), 0)
          FROM restake_history rh2
          JOIN restakes r2 ON r2.id = rh2.restake_id
          WHERE r2.point_id = ae.point_id
          AND rh2.created_at <= dh.created_at
        )
      )
    )
    FROM doubt_history dh
    JOIN doubts d ON d.id = dh.doubt_id
    WHERE d.point_id = ae.point_id
    AND dh.created_at <= ae.event_time
  ), 0)::integer as effective_doubts,
  COALESCE((
    SELECT SUM(sh.new_amount)
    FROM slash_history sh
    JOIN slashes s ON s.id = sh.slash_id
    JOIN restakes r ON r.id = s.restake_id
    WHERE r.point_id = ae.point_id
    AND sh.created_at <= ae.event_time
  ), 0) as total_slashes,
  CASE
    WHEN COALESCE((
      SELECT SUM(cred)
      FROM endorsements
      WHERE point_id = ae.point_id
      AND created_at <= ae.event_time
    ), 0) = 0 THEN 0
    WHEN COALESCE((
      SELECT SUM(cred)
      FROM endorsements
      WHERE point_id IN (
        SELECT newer_point_id FROM negations WHERE older_point_id = ae.point_id
        AND created_at <= ae.event_time
        UNION
        SELECT older_point_id FROM negations WHERE newer_point_id = ae.point_id
        AND created_at <= ae.event_time
      )
      AND created_at <= ae.event_time
    ), 0) = 0 THEN 100
    ELSE FLOOR(
      100.0 * COALESCE((
        SELECT SUM(cred)
        FROM endorsements
        WHERE point_id = ae.point_id
        AND created_at <= ae.event_time
      ), 0) / (
        COALESCE((
          SELECT SUM(cred)
          FROM endorsements
          WHERE point_id = ae.point_id
          AND created_at <= ae.event_time
        ), 0) + 
        COALESCE((
          SELECT SUM(cred)
          FROM endorsements
          WHERE point_id IN (
            SELECT newer_point_id FROM negations WHERE older_point_id = ae.point_id
            AND created_at <= ae.event_time
            UNION
            SELECT older_point_id FROM negations WHERE newer_point_id = ae.point_id
            AND created_at <= ae.event_time
          )
          AND created_at <= ae.event_time
        ), 0)
      )
    ) + GREATEST(0, 
      COALESCE((
        SELECT SUM(rh.new_amount)
        FROM restake_history rh
        JOIN restakes r ON r.id = rh.restake_id
        WHERE r.point_id = ae.point_id
        AND rh.created_at <= ae.event_time
      ), 0) - 
      GREATEST(
        COALESCE((
          SELECT SUM(
            LEAST(
              dh.new_amount,
              (
                SELECT COALESCE(SUM(rh2.new_amount), 0)
                FROM restake_history rh2
                JOIN restakes r2 ON r2.id = rh2.restake_id
                WHERE r2.point_id = ae.point_id
                AND rh2.created_at <= dh.created_at
              )
            )
          )
          FROM doubt_history dh
          JOIN doubts d ON d.id = dh.doubt_id
          WHERE d.point_id = ae.point_id
          AND dh.created_at <= ae.event_time
        ), 0),
        COALESCE((
          SELECT SUM(sh.new_amount)
          FROM slash_history sh
          JOIN slashes s ON s.id = sh.slash_id
          JOIN restakes r ON r.id = s.restake_id
          WHERE r.point_id = ae.point_id
          AND sh.created_at <= ae.event_time
        ), 0)
      )
    )
  END::integer as favor
FROM all_events ae
ORDER BY ae.event_time, ae.point_id;