ALTER TABLE "translations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "translations" CASCADE;--> statement-breakpoint
DROP VIEW "public"."point_with_details_view";--> statement-breakpoint
DROP VIEW "public"."effective_restakes_view";--> statement-breakpoint
DROP VIEW "public"."point_favor_history";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "maxCredCheck";--> statement-breakpoint
ALTER TABLE "doubt_history" DROP CONSTRAINT "doubt_history_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "doubts" DROP CONSTRAINT "doubts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "endorsements" DROP CONSTRAINT "endorsements_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "negations" DROP CONSTRAINT "negations_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "objections" DROP CONSTRAINT "objections_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "restake_history" DROP CONSTRAINT "restake_history_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "restakes" DROP CONSTRAINT "restakes_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "slash_history" DROP CONSTRAINT "slash_history_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "slashes" DROP CONSTRAINT "slashes_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "endorsements_user_id_index";--> statement-breakpoint
DROP INDEX "endorsements_point_id_index";--> statement-breakpoint
ALTER TABLE "doubt_history" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "doubts" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "endorsements" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "endorsements" ALTER COLUMN "space" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "endorsements" ALTER COLUMN "space" SET NOT NULL;--> statement-breakpoint
DELETE FROM "endorsements" WHERE "cred" <= 0;--> statement-breakpoint
UPDATE "negations" SET "created_by" = (
  SELECT "created_by" FROM "points" WHERE "points"."id" = "negations"."newer_point_id"
) WHERE "created_by" IS NULL;--> statement-breakpoint
ALTER TABLE "negations" ALTER COLUMN "created_by" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "negations" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "negations" ALTER COLUMN "space" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "negations" ALTER COLUMN "space" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "objections" ALTER COLUMN "created_by" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "objections" ALTER COLUMN "space" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "points" ALTER COLUMN "created_by" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "points" ALTER COLUMN "space" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "points" ALTER COLUMN "space" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "restake_history" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "restakes" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "slash_history" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "slashes" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "spaces" ALTER COLUMN "space_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "spaces" ALTER COLUMN "icon" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "space" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "cred" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "cred" SET DEFAULT 500;--> statement-breakpoint
ALTER TABLE "doubts" ADD COLUMN "space" varchar(100);--> statement-breakpoint
UPDATE "doubts" SET "space" = (
  SELECT "space" FROM "points" WHERE "points"."id" = "doubts"."point_id" LIMIT 1
) WHERE "space" IS NULL;--> statement-breakpoint
ALTER TABLE "doubts" ALTER COLUMN "space" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "negations" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "negations" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "negations" ADD COLUMN "deleted_by" varchar(255);--> statement-breakpoint
ALTER TABLE "objections" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "objections" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "objections" ADD COLUMN "deleted_by" varchar(255);--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN "deleted_by" varchar(255);--> statement-breakpoint
ALTER TABLE "restakes" ADD COLUMN "space" varchar(100);--> statement-breakpoint
UPDATE "restakes" SET "space" = (
  SELECT "space" FROM "points" WHERE "points"."id" = "restakes"."point_id" LIMIT 1
) WHERE "space" IS NULL;--> statement-breakpoint
ALTER TABLE "restakes" ALTER COLUMN "space" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "slashes" ADD COLUMN "space" varchar(100);--> statement-breakpoint
UPDATE "slashes" SET "space" = (
  SELECT "space" FROM "points" WHERE "points"."id" = "slashes"."point_id" LIMIT 1
) WHERE "space" IS NULL;--> statement-breakpoint
ALTER TABLE "slashes" ALTER COLUMN "space" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "doubt_history" ADD CONSTRAINT "doubt_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negations" ADD CONSTRAINT "negations_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negations" ADD CONSTRAINT "negations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "points_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "points_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restake_history" ADD CONSTRAINT "restake_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restakes" ADD CONSTRAINT "restakes_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restakes" ADD CONSTRAINT "restakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slash_history" ADD CONSTRAINT "slash_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slashes" ADD CONSTRAINT "slashes_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slashes" ADD CONSTRAINT "slashes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doubts_space_idx" ON "doubts" USING btree ("space");--> statement-breakpoint
CREATE INDEX "endorsements_user_idx" ON "endorsements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "endorsements_point_idx" ON "endorsements" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX "endorsements_space_idx" ON "endorsements" USING btree ("space");--> statement-breakpoint
CREATE INDEX "endorsements_created_at_idx" ON "endorsements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "negations_created_by_idx" ON "negations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "negations_space_idx" ON "negations" USING btree ("space");--> statement-breakpoint
CREATE INDEX "negations_active_idx" ON "negations" USING btree ("is_active","deleted_at");--> statement-breakpoint
CREATE INDEX "objections_created_by_idx" ON "objections" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "objections_space_idx" ON "objections" USING btree ("space");--> statement-breakpoint
CREATE INDEX "objections_active_idx" ON "objections" USING btree ("is_active","deleted_at");--> statement-breakpoint
CREATE INDEX "objections_endorsement_idx" ON "objections" USING btree ("endorsement_id");--> statement-breakpoint
CREATE INDEX "points_created_by_idx" ON "points" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "points_space_idx" ON "points" USING btree ("space");--> statement-breakpoint
CREATE INDEX "points_active_idx" ON "points" USING btree ("is_active","deleted_at");--> statement-breakpoint
CREATE INDEX "restakes_space_idx" ON "restakes" USING btree ("space");--> statement-breakpoint
CREATE INDEX "slashes_space_idx" ON "slashes" USING btree ("space");--> statement-breakpoint
CREATE INDEX "spaces_pinned_point_idx" ON "spaces" USING btree ("pinned_point_id");--> statement-breakpoint
CREATE INDEX "topics_space_idx" ON "topics" USING btree ("space");--> statement-breakpoint
CREATE INDEX "topics_name_idx" ON "topics" USING btree ("name");--> statement-breakpoint
ALTER TABLE "endorsements" ADD CONSTRAINT "positive_cred" CHECK ("endorsements"."cred" > 0);--> statement-breakpoint
ALTER TABLE "negations" ADD CONSTRAINT "soft_delete_consistency" CHECK (("negations"."is_active" = true AND "negations"."deleted_at" IS NULL AND "negations"."deleted_by" IS NULL) OR ("negations"."is_active" = false AND "negations"."deleted_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "soft_delete_consistency" CHECK (("objections"."is_active" = true AND "objections"."deleted_at" IS NULL AND "objections"."deleted_by" IS NULL) OR ("objections"."is_active" = false AND "objections"."deleted_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "content_length_check" CHECK (LENGTH("points"."content") >= 1 AND LENGTH("points"."content") <= 10000);--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "soft_delete_consistency" CHECK (("points"."is_active" = true AND "points"."deleted_at" IS NULL AND "points"."deleted_by" IS NULL) OR ("points"."is_active" = false AND "points"."deleted_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE spaces ADD CONSTRAINT spaces_pinned_point_fk 
FOREIGN KEY (pinned_point_id) REFERENCES points(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE VIEW "public"."point_with_details_view" AS (select "id", "content", "created_at", "created_by", "space", "is_command", "is_active", "deleted_at", "deleted_by",
        COALESCE((
          SELECT COUNT(*)
          FROM (
            SELECT older_point_id AS point_id FROM "negations"
            WHERE "negations"."is_active" = true
            UNION ALL
            SELECT newer_point_id AS point_id FROM "negations"
          ) sub
          WHERE point_id = "points".id
        ), 0)
       as "amount_negations", 
        COALESCE((
          SELECT COUNT(DISTINCT "user_id")
          FROM "endorsements"
          WHERE "point_id" = "points".id
        ), 0)
       as "amount_supporters", 
        COALESCE((
          SELECT SUM("cred")
          FROM "endorsements"
          WHERE "point_id" = "points".id
        ), 0)
       as "cred", 
        COALESCE((
          SELECT SUM("cred")
          FROM "endorsements"
          WHERE "point_id" IN (
            SELECT newer_point_id
            FROM "negations"
            WHERE older_point_id = "points".id
            AND "negations"."is_active" = true
            UNION
            SELECT older_point_id
            FROM "negations"
            WHERE newer_point_id = "points".id
            AND "negations"."is_active" = true
          )
        ), 0)
       as "negations_cred", 
          ARRAY(
            SELECT older_point_id
            FROM "negations"
            WHERE newer_point_id = "points".id
            AND "negations"."is_active" = true
            UNION
            SELECT newer_point_id
            FROM "negations"
            WHERE older_point_id = "points".id
            AND "negations"."is_active" = true
          )
         as "negation_ids" from "points" WHERE "points"."is_active" = true);--> statement-breakpoint
CREATE VIEW "public"."effective_restakes_view" AS (select "user_id", "point_id", "negation_id", "amount", "space", "created_at", 
        COALESCE((
          SELECT "amount"
          FROM "slashes"
          WHERE "restake_id" = "restakes"."id"
          AND "amount" > 0 
          AND "slashes"."created_at" > "restakes"."created_at"
        ), 0)
       as "slashed_amount", 
        COALESCE((
          SELECT SUM("amount")
          FROM "doubts"
          WHERE "doubts"."point_id" = "restakes"."point_id"
          AND "doubts"."negation_id" = "restakes"."negation_id"
          AND "doubts"."created_at" >= "restakes"."created_at"
        ), 0)
       as "doubted_amount", 
        GREATEST(0, "amount" - 
          COALESCE((
            SELECT "amount"
            FROM "slashes"
            WHERE "restake_id" = "restakes"."id"
            AND "amount" > 0 
            AND "slashes"."created_at" > "restakes"."created_at"
          ), 0)
        )
       as "effective_amount", 
        "amount" > COALESCE((
          SELECT "amount"
          FROM "slashes"
          WHERE "restake_id" = "restakes"."id"
          AND "amount" > 0 
          AND "slashes"."created_at" > "restakes"."created_at"
        ), 0)
       as "available_for_doubts" from "restakes" where "restakes"."amount" > 0);--> statement-breakpoint
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