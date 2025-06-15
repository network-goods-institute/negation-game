-- Drop views that need to be recreated (idempotent)
DROP VIEW IF EXISTS "public"."point_with_details_view";
DROP VIEW IF EXISTS "public"."point_favor_history_view";

-- Create indexes (idempotent with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "chats_user_id_idx" ON "chats" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "chats_space_id_idx" ON "chats" USING btree ("space_id");
CREATE INDEX IF NOT EXISTS "chats_created_at_idx" ON "chats" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "chats_is_deleted_idx" ON "chats" USING btree ("is_deleted");
CREATE INDEX IF NOT EXISTS "chats_is_shared_idx" ON "chats" USING btree ("is_shared");
CREATE UNIQUE INDEX IF NOT EXISTS "uniqueTermIndex" ON "definitions" USING btree (("space" || '-' || lower("term")));
CREATE INDEX IF NOT EXISTS "doubts_restake_amount_idx" ON "doubts" USING btree ("point_id","amount");
CREATE INDEX IF NOT EXISTS "doubts_user_space_idx" ON "doubts" USING btree ("user_id","space");
CREATE INDEX IF NOT EXISTS "embeddingIndex" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "endorsements_point_cred_idx" ON "endorsements" USING btree ("point_id","cred");
CREATE INDEX IF NOT EXISTS "endorsements_point_user_cred_idx" ON "endorsements" USING btree ("point_id","user_id","cred");
CREATE INDEX IF NOT EXISTS "endorsements_user_space_point_created_idx" ON "endorsements" USING btree ("user_id","space","point_id","created_at");
CREATE INDEX IF NOT EXISTS "negations_active_older_idx" ON "negations" USING btree ("older_point_id","is_active") WHERE "negations"."is_active" = true;
CREATE INDEX IF NOT EXISTS "negations_active_newer_idx" ON "negations" USING btree ("newer_point_id","is_active") WHERE "negations"."is_active" = true;
CREATE INDEX IF NOT EXISTS "negations_active_both_idx" ON "negations" USING btree ("older_point_id","newer_point_id","is_active") WHERE "negations"."is_active" = true;
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_source_user_idx" ON "notifications" USING btree ("source_user_id");
CREATE INDEX IF NOT EXISTS "notifications_source_entity_idx" ON "notifications" USING btree ("source_entity_id");
CREATE INDEX IF NOT EXISTS "notifications_space_idx" ON "notifications" USING btree ("space");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "notifications_read_at_idx" ON "notifications" USING btree ("read_at");
CREATE INDEX IF NOT EXISTS "points_created_at_idx" ON "points" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "points_space_active_created_idx" ON "points" USING btree ("space","is_active","created_at");
CREATE INDEX IF NOT EXISTS "points_space_active_idx" ON "points" USING btree ("space","is_active");
CREATE INDEX IF NOT EXISTS "restakes_point_negation_idx" ON "restakes" USING btree ("point_id","negation_id");
CREATE INDEX IF NOT EXISTS "restakes_negation_user_idx" ON "restakes" USING btree ("negation_id","user_id");
CREATE INDEX IF NOT EXISTS "restakes_point_negation_amount_idx" ON "restakes" USING btree ("point_id","negation_id","amount");
CREATE INDEX IF NOT EXISTS "slashes_restake_amount_idx" ON "slashes" USING btree ("restake_id","amount");
CREATE INDEX IF NOT EXISTS "slashes_user_space_idx" ON "slashes" USING btree ("user_id","space");
CREATE INDEX IF NOT EXISTS "spaces_pinned_point_idx" ON "spaces" USING btree ("pinned_point_id");

-- Create current_point_favor view (idempotent)
CREATE OR REPLACE VIEW "public"."current_point_favor" AS (select "id", 
        COALESCE((
          SELECT SUM("cred")
          FROM "endorsements"
          WHERE "point_id" = "id"
        ), 0)
       as "cred", 
        COALESCE((
          SELECT SUM("cred")
          FROM "endorsements"
          WHERE "point_id" IN (
            SELECT "newer_point_id"
            FROM "negations"
            WHERE "older_point_id" = "id"
            AND "is_active" = true
            UNION
            SELECT "older_point_id"
            FROM "negations"
            WHERE "newer_point_id" = "id"
            AND "is_active" = true
          )
        ), 0)
       as "negations_cred", 
        COALESCE((
          SELECT SUM(
            GREATEST(0, 
              "amount" - COALESCE((
                SELECT "amount"
                FROM "slashes"
                WHERE "restake_id" = "id"
              ), 0)
            ) - GREATEST(0, COALESCE((
              SELECT SUM("amount")
              FROM "doubts"
              WHERE "point_id" = "point_id"
              AND "negation_id" = "negation_id"
            ), 0) - COALESCE((
              SELECT "amount"
              FROM "slashes"
              WHERE "restake_id" = "id"
            ), 0))
          )
          FROM "restakes"
          WHERE "point_id" = "id"
          AND "amount" > 0
        ), 0)
       as "restake_bonus", 
        CASE
          WHEN COALESCE((
            SELECT SUM("cred")
            FROM "endorsements"
            WHERE "point_id" = "id"
          ), 0) = 0 THEN 0
          WHEN COALESCE((
            SELECT SUM("cred")
            FROM "endorsements"
            WHERE "point_id" IN (
              SELECT "newer_point_id"
              FROM "negations"
              WHERE "older_point_id" = "id"
              AND "is_active" = true
              UNION
              SELECT "older_point_id"
              FROM "negations"
              WHERE "newer_point_id" = "id"
              AND "is_active" = true
            )
          ), 0) = 0 THEN 100
          ELSE FLOOR(
            100.0 * COALESCE((
              SELECT SUM("cred")
              FROM "endorsements"
              WHERE "point_id" = "id"
            ), 0) / 
            (
              COALESCE((
                SELECT SUM("cred")
                FROM "endorsements"
                WHERE "point_id" = "id"
              ), 0) + 
              COALESCE((
                SELECT SUM("cred")
                FROM "endorsements"
                WHERE "point_id" IN (
                  SELECT "newer_point_id"
                  FROM "negations"
                  WHERE "older_point_id" = "id"
                  AND "is_active" = true
                  UNION
                  SELECT "older_point_id"
                  FROM "negations"
                  WHERE "newer_point_id" = "id"
                  AND "is_active" = true
                )
              ), 0)
            )
          ) + COALESCE((
            SELECT SUM(
              GREATEST(0, 
                "amount" - COALESCE((
                  SELECT "amount"
                  FROM "slashes"
                  WHERE "restake_id" = "id"
                ), 0)
              ) - GREATEST(0, COALESCE((
                SELECT SUM("amount")
                FROM "doubts"
                WHERE "point_id" = "point_id"
                AND "negation_id" = "negation_id"
              ), 0) - COALESCE((
                SELECT "amount"
                FROM "slashes"
                WHERE "restake_id" = "id"
              ), 0))
            )
            FROM "restakes"
            WHERE "point_id" = "id"
            AND "amount" > 0
          ), 0)
        END::integer
       as "favor" from "points" where "points"."is_active" = true);

-- Create point_favor_history_view without favor_queried (fixed version)
CREATE OR REPLACE VIEW "public"."point_favor_history_view" AS (
  WITH all_events_with_stats AS (
    (SELECT id as point_id, created_at as event_time, 'point_created' as event_type FROM points)
    UNION
    (SELECT point_id, created_at as event_time, 'endorsement_created' as event_type FROM endorsements)
    UNION
    (SELECT older_point_id as point_id, created_at as event_time, 'negation_created' as event_type FROM negations WHERE is_active = true)
    UNION
    (SELECT newer_point_id as point_id, created_at as event_time, 'negation_created' as event_type FROM negations WHERE is_active = true)
    UNION
    (SELECT point_id, created_at as event_time, 'restake_created' as event_type FROM restakes WHERE amount > 0)
    UNION
    (SELECT r.point_id, s.created_at as event_time, 'slash_created' as event_type FROM slashes s JOIN restakes r ON s.restake_id = r.id)
    UNION
    (SELECT point_id, created_at as event_time, 'doubt_created' as event_type FROM doubts WHERE amount > 0)
  )
  SELECT 
    all_events_with_stats.point_id as point_id,
    all_events_with_stats.event_type as event_type,
    all_events_with_stats.event_time as event_time,
    COALESCE((
      SELECT SUM(cred)
      FROM endorsements
      WHERE point_id = all_events_with_stats.point_id
      AND created_at <= all_events_with_stats.event_time
    ), 0) as cred,
    COALESCE((
      SELECT SUM(cred)
      FROM endorsements
      WHERE point_id IN (
        SELECT newer_point_id
        FROM negations
        WHERE older_point_id = all_events_with_stats.point_id
        AND is_active = true
        AND created_at <= all_events_with_stats.event_time
        UNION
        SELECT older_point_id
        FROM negations
        WHERE newer_point_id = all_events_with_stats.point_id
        AND is_active = true
        AND created_at <= all_events_with_stats.event_time
      )
      AND created_at <= all_events_with_stats.event_time
    ), 0) as negations_cred,
    COALESCE((
      SELECT SUM(
        GREATEST(0, 
          amount - COALESCE((
            SELECT amount
            FROM slashes
            WHERE restake_id = restakes.id
            AND created_at <= all_events_with_stats.event_time
          ), 0)
        ) - GREATEST(0, COALESCE((
          SELECT SUM(amount)
          FROM doubts
          WHERE point_id = restakes.point_id
          AND negation_id = restakes.negation_id
          AND created_at <= all_events_with_stats.event_time
        ), 0) - COALESCE((
          SELECT amount
          FROM slashes
          WHERE restake_id = restakes.id
          AND created_at <= all_events_with_stats.event_time
        ), 0))
      )
      FROM restakes
      WHERE point_id = all_events_with_stats.point_id
      AND amount > 0
      AND created_at <= all_events_with_stats.event_time
    ), 0) as restake_bonus,
    CASE
      WHEN COALESCE((
        SELECT SUM(cred)
        FROM endorsements
        WHERE point_id = all_events_with_stats.point_id
        AND created_at <= all_events_with_stats.event_time
      ), 0) = 0 THEN 0
      WHEN COALESCE((
        SELECT SUM(cred)
        FROM endorsements
        WHERE point_id IN (
          SELECT newer_point_id
          FROM negations
          WHERE older_point_id = all_events_with_stats.point_id
          AND is_active = true
          AND created_at <= all_events_with_stats.event_time
          UNION
          SELECT older_point_id
          FROM negations
          WHERE newer_point_id = all_events_with_stats.point_id
          AND is_active = true
          AND created_at <= all_events_with_stats.event_time
        )
        AND created_at <= all_events_with_stats.event_time
      ), 0) = 0 THEN 100
      ELSE FLOOR(
        100.0 * COALESCE((
          SELECT SUM(cred)
          FROM endorsements
          WHERE point_id = all_events_with_stats.point_id
          AND created_at <= all_events_with_stats.event_time
        ), 0) / 
        (
          COALESCE((
            SELECT SUM(cred)
            FROM endorsements
            WHERE point_id = all_events_with_stats.point_id
            AND created_at <= all_events_with_stats.event_time
          ), 0) + 
          COALESCE((
            SELECT SUM(cred)
            FROM endorsements
            WHERE point_id IN (
              SELECT newer_point_id
              FROM negations
              WHERE older_point_id = all_events_with_stats.point_id
              AND is_active = true
              AND created_at <= all_events_with_stats.event_time
              UNION
              SELECT older_point_id
              FROM negations
              WHERE newer_point_id = all_events_with_stats.point_id
              AND is_active = true
              AND created_at <= all_events_with_stats.event_time
            )
            AND created_at <= all_events_with_stats.event_time
          ), 0)
        )
      ) + COALESCE((
        SELECT SUM(
          GREATEST(0, 
            amount - COALESCE((
              SELECT amount
              FROM slashes
              WHERE restake_id = restakes.id
              AND created_at <= all_events_with_stats.event_time
            ), 0)
          ) - GREATEST(0, COALESCE((
            SELECT SUM(amount)
            FROM doubts
            WHERE point_id = restakes.point_id
            AND negation_id = restakes.negation_id
            AND created_at <= all_events_with_stats.event_time
          ), 0) - COALESCE((
            SELECT amount
            FROM slashes
            WHERE restake_id = restakes.id
            AND created_at <= all_events_with_stats.event_time
          ), 0))
        )
        FROM restakes
        WHERE point_id = all_events_with_stats.point_id
        AND amount > 0
        AND created_at <= all_events_with_stats.event_time
      ), 0)
    END::integer as favor
  FROM all_events_with_stats
);

-- Create point_with_details_view (idempotent)
CREATE OR REPLACE VIEW "public"."point_with_details_view" AS (select "id", "content", "created_at", "created_by", "space", "is_command", "is_active", "deleted_at", "deleted_by", 
        COALESCE((
          SELECT COUNT(*)
          FROM (
            SELECT "older_point_id" AS point_id FROM "negations"
            WHERE "is_active" = true
            UNION
            SELECT "newer_point_id" AS point_id FROM "negations"
            WHERE "is_active" = true
          ) sub
          WHERE sub.point_id = "id"
        ), 0)
       as "amount_negations", 
        COALESCE((
          SELECT COUNT(DISTINCT "user_id")
          FROM "endorsements"
          WHERE "point_id" = "id"
        ), 0)
       as "amount_supporters", 
        COALESCE((
          SELECT SUM("cred")
          FROM "endorsements"
          WHERE "point_id" = "id"
        ), 0)
       as "cred", 
        COALESCE((
          SELECT SUM("cred")
          FROM "endorsements"
          WHERE "point_id" IN (
            SELECT "newer_point_id"
            FROM "negations"
            WHERE "older_point_id" = "id"
            AND "is_active" = true
            UNION
            SELECT "older_point_id"
            FROM "negations"
            WHERE "newer_point_id" = "id"
            AND "is_active" = true
          )
        ), 0)
       as "negations_cred", 
        ARRAY(
          SELECT "older_point_id"
          FROM "negations"
          WHERE "newer_point_id" = "id"
          AND "is_active" = true
          UNION
          SELECT "newer_point_id"
          FROM "negations"
          WHERE "older_point_id" = "id"
          AND "is_active" = true
        )
       as "negation_ids" from "points" where "points"."is_active" = true);