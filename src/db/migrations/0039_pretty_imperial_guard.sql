DROP VIEW IF EXISTS "public"."effective_restakes_view" CASCADE;
DROP VIEW IF EXISTS "public"."point_favor_history" CASCADE;

CREATE VIEW "public"."effective_restakes_view" AS (
  SELECT 
    r.user_id,
    r.point_id,
    r.negation_id,
    r.amount,
    COALESCE((
      SELECT s.amount
      FROM slashes s
      WHERE s.restake_id = r.id
      AND s.amount > 0 
      AND s.created_at > r.created_at
    ), 0) as slashed_amount,
    COALESCE((
      SELECT SUM(d.amount)
      FROM doubts d
      WHERE d.point_id = r.point_id
      AND d.negation_id = r.negation_id
    ), 0) as doubted_amount,
    GREATEST(0, r.amount - 
      COALESCE((
        SELECT s.amount
        FROM slashes s
        WHERE s.restake_id = r.id
        AND s.amount > 0 
        AND s.created_at > r.created_at
      ), 0)
    ) as effective_amount,
    r.amount > (
      COALESCE((
        SELECT s.amount
        FROM slashes s
        WHERE s.restake_id = r.id
        AND s.amount > 0 
        AND s.created_at > r.created_at
      ), 0)
    ) as is_active
  FROM restakes r
  WHERE r.amount > 0
);

CREATE VIEW "public"."point_favor_history" AS (
  WITH all_events AS (
    SELECT id as point_id, created_at as event_time, 'point_created' as event_type FROM points
    UNION
    SELECT point_id, created_at as event_time, 'endorsement_made' as event_type FROM endorsements
    UNION
    SELECT older_point_id as point_id, created_at as event_time, 'negation_made' as event_type FROM negations
    UNION
    SELECT newer_point_id as point_id, created_at as event_time, 'negation_made' as event_type FROM negations
    UNION
    SELECT 
      CASE 
        WHEN negations.older_point_id = endorsements.point_id THEN negations.newer_point_id
        ELSE negations.older_point_id
      END as point_id,
      endorsements.created_at as event_time,
      'negation_endorsed' as event_type
    FROM endorsements
    LEFT JOIN negations ON (
      (negations.older_point_id = endorsements.point_id OR negations.newer_point_id = endorsements.point_id)
      AND negations.created_at <= endorsements.created_at
    )
    UNION
    SELECT restakes.point_id, restake_history.created_at as event_time, 'restake_modified' as event_type
    FROM restake_history
    INNER JOIN restakes ON restake_history.restake_id = restakes.id
    UNION
    SELECT restakes.point_id, slash_history.created_at as event_time, 'slash_modified' as event_type
    FROM slash_history
    INNER JOIN slashes ON slash_history.slash_id = slashes.id
    INNER JOIN restakes ON slashes.restake_id = restakes.id
    UNION
    SELECT doubts.point_id, doubt_history.created_at as event_time, 'doubt_modified' as event_type
    FROM doubt_history
    INNER JOIN doubts ON doubt_history.doubt_id = doubts.id
    UNION
    SELECT id as point_id, NOW() as event_time, 'favor_queried' as event_type FROM points
  ),
  all_events_with_stats AS (
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
    all_events_with_stats.point_id as "point_id",
    all_events_with_stats.event_type as "event_type",
    all_events_with_stats.event_time as "event_time",
    all_events_with_stats.cred as "cred",
    all_events_with_stats.negations_cred as "negations_cred",
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
  ORDER BY event_time, point_id
);