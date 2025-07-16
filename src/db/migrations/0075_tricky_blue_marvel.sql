DO $$ BEGIN
    CREATE TYPE "public"."point_action" AS ENUM('created', 'edited', 'deleted', 'restored');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "point_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"point_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"action" "point_action" NOT NULL,
	"previous_content" text,
	"new_content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP VIEW IF EXISTS "public"."point_with_details_view";--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN IF NOT EXISTS "is_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN IF NOT EXISTS "edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN IF NOT EXISTS "edited_by" varchar(255);--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN IF NOT EXISTS "edit_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "point_history" ADD CONSTRAINT "point_history_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "point_history" ADD CONSTRAINT "point_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "point_history_point_idx" ON "point_history" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "point_history_user_idx" ON "point_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "point_history_action_idx" ON "point_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "point_history_created_at_idx" ON "point_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "point_history_point_created_at_idx" ON "point_history" USING btree ("point_id","created_at");--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "points" ADD CONSTRAINT "points_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "points_edited_at_idx" ON "points" USING btree ("edited_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "points_edited_by_idx" ON "points" USING btree ("edited_by");--> statement-breakpoint
CREATE VIEW "public"."point_with_details_view" AS (select
    "points"."id",
    "points"."content",
    "points"."created_at",
    "points"."created_by",
    "points"."space",
    "points"."is_command",
    "points"."is_active",
    "points"."deleted_at",
    "points"."deleted_by",
    "points"."is_edited",
    "points"."edited_at",
    "points"."edited_by",
    "points"."edit_count",
    COALESCE((
        SELECT COUNT(*)
        FROM (
            SELECT "older_point_id" AS point_id FROM "negations"
            WHERE "is_active" = true
            UNION ALL
            SELECT "newer_point_id" AS point_id FROM "negations"
            WHERE "is_active" = true
        ) sub
        WHERE sub.point_id = "points"."id"
    ), 0) as "amount_negations",
    COALESCE((
        SELECT COUNT(DISTINCT "user_id")
        FROM "endorsements"
        WHERE "point_id" = "points"."id"
    ), 0) as "amount_supporters",
    COALESCE((
        SELECT SUM("cred")
        FROM "endorsements"
        WHERE "point_id" = "points"."id"
    ), 0) as "cred",
    COALESCE((
        SELECT SUM("cred")
        FROM "endorsements"
        WHERE "point_id" IN (
            SELECT "newer_point_id"
            FROM "negations"
            WHERE "older_point_id" = "points"."id"
            AND "is_active" = true
            UNION
            SELECT "older_point_id"
            FROM "negations"
            WHERE "newer_point_id" = "points"."id"
            AND "is_active" = true
        )
    ), 0) as "negations_cred",
    ARRAY(
        SELECT "older_point_id"
        FROM "negations"
        WHERE "newer_point_id" = "points"."id"
        AND "is_active" = true
        UNION ALL
        SELECT "newer_point_id"
        FROM "negations"
        WHERE "older_point_id" = "points"."id"
        AND "is_active" = true
    ) as "negation_ids"
from "points" where "points"."is_active" = true);