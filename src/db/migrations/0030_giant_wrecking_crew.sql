CREATE TYPE "public"."doubt_action" AS ENUM('created', 'deactivated', 'reduced_by_slash');--> statement-breakpoint
CREATE TYPE "public"."restake_action" AS ENUM('created', 'increased', 'decreased', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."slash_action" AS ENUM('created', 'increased', 'decreased', 'deactivated');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doubt_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"doubt_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"action" "doubt_action" NOT NULL,
	"previous_amount" integer,
	"new_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doubts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"last_earnings_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"immutable" boolean DEFAULT true NOT NULL,
	CONSTRAINT "unique_doubt" UNIQUE("user_id","point_id","negation_id"),
	CONSTRAINT "amount_non_negative_constraint" CHECK ("doubts"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "restake_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"restake_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"action" "restake_action" NOT NULL,
	"previous_amount" integer,
	"new_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "restakes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_restake" UNIQUE("user_id","point_id","negation_id"),
	CONSTRAINT "amount_non_negative_constraint" CHECK ("restakes"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slash_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"slash_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"action" "slash_action" NOT NULL,
	"previous_amount" integer,
	"new_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slashes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"restake_id" integer NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_slash" UNIQUE("user_id","restake_id"),
	CONSTRAINT "amount_non_negative_constraint" CHECK ("slashes"."amount" >= 0)
);
--> statement-breakpoint
DROP VIEW "public"."point_favor_history";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "cred" SET DEFAULT 500;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doubt_history" ADD CONSTRAINT "doubt_history_doubt_id_doubts_id_fk" FOREIGN KEY ("doubt_id") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doubt_history" ADD CONSTRAINT "doubt_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doubt_history" ADD CONSTRAINT "doubt_history_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doubt_history" ADD CONSTRAINT "doubt_history_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doubts" ADD CONSTRAINT "doubts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doubts" ADD CONSTRAINT "doubts_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doubts" ADD CONSTRAINT "doubts_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "restake_history" ADD CONSTRAINT "restake_history_restake_id_restakes_id_fk" FOREIGN KEY ("restake_id") REFERENCES "public"."restakes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "restake_history" ADD CONSTRAINT "restake_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "restake_history" ADD CONSTRAINT "restake_history_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "restake_history" ADD CONSTRAINT "restake_history_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "restakes" ADD CONSTRAINT "restakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "restakes" ADD CONSTRAINT "restakes_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "restakes" ADD CONSTRAINT "restakes_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slash_history" ADD CONSTRAINT "slash_history_slash_id_slashes_id_fk" FOREIGN KEY ("slash_id") REFERENCES "public"."slashes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slash_history" ADD CONSTRAINT "slash_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slash_history" ADD CONSTRAINT "slash_history_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slash_history" ADD CONSTRAINT "slash_history_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slashes" ADD CONSTRAINT "slashes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slashes" ADD CONSTRAINT "slashes_restake_id_restakes_id_fk" FOREIGN KEY ("restake_id") REFERENCES "public"."restakes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slashes" ADD CONSTRAINT "slashes_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slashes" ADD CONSTRAINT "slashes_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubt_history_doubt_idx" ON "doubt_history" USING btree ("doubt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubt_history_user_idx" ON "doubt_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubt_history_point_idx" ON "doubt_history" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubt_history_negation_idx" ON "doubt_history" USING btree ("negation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubts_user_idx" ON "doubts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubts_point_idx" ON "doubts" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubts_negation_idx" ON "doubts" USING btree ("negation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restake_history_restake_idx" ON "restake_history" USING btree ("restake_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restake_history_user_idx" ON "restake_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restake_history_point_idx" ON "restake_history" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restake_history_negation_idx" ON "restake_history" USING btree ("negation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restakes_user_idx" ON "restakes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restakes_point_idx" ON "restakes" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restakes_negation_idx" ON "restakes" USING btree ("negation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slash_history_slash_idx" ON "slash_history" USING btree ("slash_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slash_history_user_idx" ON "slash_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slash_history_point_idx" ON "slash_history" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slash_history_negation_idx" ON "slash_history" USING btree ("negation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slashes_user_idx" ON "slashes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slashes_restake_idx" ON "slashes" USING btree ("restake_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slashes_point_idx" ON "slashes" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "slashes_negation_idx" ON "slashes" USING btree ("negation_id");--> statement-breakpoint
CREATE VIEW "public"."effective_restakes_view" AS (select "user_id", "point_id", "negation_id", "amount", 
        COALESCE((
          SELECT "amount"
          FROM "slashes"
          WHERE "restake_id" = "id"
          AND "amount" > 0 
          AND "created_at" > "created_at"
        ), 0)
       as "slashed_amount", 
        COALESCE((
          SELECT SUM("amount")
          FROM "doubts"
          WHERE "point_id" = "point_id"
          AND "negation_id" = "negation_id"
        ), 0)
       as "doubted_amount", 
        GREATEST(0, "amount" - 
          COALESCE((
            SELECT "amount"
            FROM "slashes"
            WHERE "restake_id" = "id"
            AND "amount" > 0 
            AND "created_at" > "created_at"
          ), 0)
        )
       as "effective_amount", 
        "amount" > (
          COALESCE((
            SELECT "amount"
            FROM "slashes"
            WHERE "restake_id" = "id"
            AND "amount" > 0 
            AND "created_at" > "created_at"
          ), 0) +
          COALESCE((
            SELECT SUM("amount")
            FROM "doubts"
            WHERE "point_id" = "point_id"
            AND "negation_id" = "negation_id"
          ), 0)
        )
       as "is_active" from "restakes" where "restakes"."amount" > 0);--> statement-breakpoint
CREATE VIEW "public"."point_favor_history" AS (
  WITH all_events AS (
    SELECT id as point_id, created_at as event_time, 'point_created' as event_type
    FROM points
    UNION
    SELECT point_id, created_at as event_time, 'endorsement_made' as event_type
    FROM endorsements
    UNION
    SELECT older_point_id as point_id, created_at as event_time, 'negation_made' as event_type
    FROM negations
    UNION
    SELECT newer_point_id as point_id, created_at as event_time, 'negation_made' as event_type
    FROM negations
    UNION
    SELECT 
      CASE 
        WHEN negations.older_point_id = endorsements.point_id 
        THEN negations.newer_point_id
        ELSE negations.older_point_id
      END as point_id,
      endorsements.created_at as event_time,
      'negation_endorsed' as event_type
    FROM endorsements
    LEFT JOIN negations ON (
      (negations.older_point_id = endorsements.point_id OR 
       negations.newer_point_id = endorsements.point_id)
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
    SELECT id as point_id, NOW() as event_time, 'favor_queried' as event_type
    FROM points
    UNION
    SELECT doubts.point_id, doubt_history.created_at as event_time, 'doubt_modified' as event_type
    FROM doubt_history
    INNER JOIN doubts ON doubt_history.doubt_id = doubts.id
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
                SELECT FLOOR(rh.new_amount - GREATEST(
                  COALESCE((
                    SELECT sh.new_amount
                    FROM slash_history sh
                    JOIN slashes s ON s.id = sh.slash_id
                    WHERE s.restake_id = r.id
                    AND sh.created_at <= all_events_with_stats.event_time
                    ORDER BY sh.created_at DESC
                    LIMIT 1
                  ), 0),
                  COALESCE((
                    SELECT SUM(d.amount)
                    FROM doubts d
                    WHERE d.point_id = r.point_id
                    AND d.negation_id = r.negation_id
                    AND d.created_at <= all_events_with_stats.event_time
                  ), 0)
                ))
                FROM restake_history rh
                JOIN restakes r ON r.id = rh.restake_id
                WHERE r.point_id = all_events_with_stats.point_id
                AND rh.created_at = all_events_with_stats.event_time
              )
              WHEN 'slash_modified' THEN (
                SELECT FLOOR(r.amount - GREATEST(
                  sh.new_amount,
                  COALESCE((
                    SELECT SUM(d.amount)
                    FROM doubts d
                    WHERE d.point_id = r.point_id
                    AND d.negation_id = r.negation_id
                    AND d.created_at <= all_events_with_stats.event_time
                  ), 0)
                ))
                FROM slash_history sh
                JOIN slashes s ON s.id = sh.slash_id
                JOIN restakes r ON r.id = s.restake_id
                WHERE r.point_id = all_events_with_stats.point_id
                AND sh.created_at = all_events_with_stats.event_time
              )
              WHEN 'doubt_modified' THEN (
                SELECT FLOOR(rh.new_amount - GREATEST(
                  COALESCE((
                    SELECT sh.new_amount
                    FROM slash_history sh
                    JOIN slashes s ON s.id = sh.slash_id
                    WHERE s.restake_id = r.id
                    AND sh.created_at <= all_events_with_stats.event_time
                    ORDER BY sh.created_at DESC
                    LIMIT 1
                  ), 0),
                  COALESCE((
                    SELECT SUM(d.amount)
                    FROM doubts d
                    WHERE d.point_id = r.point_id
                    AND d.negation_id = r.negation_id
                    AND d.created_at <= all_events_with_stats.event_time
                  ), 0)
                ))
                FROM doubt_history dh
                JOIN doubts d ON d.id = dh.doubt_id
                JOIN restakes r ON r.point_id = d.point_id
                JOIN restake_history rh ON rh.restake_id = r.id
                WHERE d.point_id = all_events_with_stats.point_id
                AND dh.created_at = all_events_with_stats.event_time
                ORDER BY rh.created_at DESC
                LIMIT 1
              )
              ELSE (
                SELECT GREATEST(0, FLOOR(rh.new_amount - GREATEST(
                  COALESCE((
                    SELECT sh.new_amount
                    FROM slash_history sh
                    JOIN slashes s ON s.id = sh.slash_id
                    WHERE s.restake_id = r.id
                    AND sh.created_at <= all_events_with_stats.event_time
                    ORDER BY sh.created_at DESC
                    LIMIT 1
                  ), 0),
                  COALESCE((
                    SELECT SUM(d.amount)
                    FROM doubts d
                    WHERE d.point_id = r.point_id
                    AND d.negation_id = r.negation_id
                    AND d.created_at <= all_events_with_stats.event_time
                  ), 0)
                )))
                FROM restake_history rh
                JOIN restakes r ON r.id = rh.restake_id
                WHERE r.point_id = all_events_with_stats.point_id
                AND rh.created_at <= all_events_with_stats.event_time
                ORDER BY rh.created_at DESC
                LIMIT 1
              )
            END,
            0
          )
      END
    ) as favor
  FROM all_events_with_stats
  ORDER BY event_time, point_id
);