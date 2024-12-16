DROP TYPE IF EXISTS "public"."doubt_action" CASCADE;
CREATE TYPE "public"."doubt_action" AS ENUM('created', 'increased', 'decreased', 'deactivated');--> statement-breakpoint
DROP TABLE IF EXISTS "doubt_history" CASCADE;
CREATE TABLE "doubt_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"doubt_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL REFERENCES "points"("id") ON DELETE CASCADE,
	"negation_id" integer NOT NULL REFERENCES "points"("id") ON DELETE CASCADE,
	"action" "doubt_action" NOT NULL,
	"previous_amount" integer,
	"new_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE IF EXISTS "doubts" CASCADE;
CREATE TABLE "doubts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"last_earnings_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_doubt" UNIQUE("user_id", "point_id", "negation_id"),
	CONSTRAINT "amount_non_negative_constraint" CHECK ("doubts"."amount" >= 0)
);
--> statement-breakpoint
DROP VIEW IF EXISTS "public"."effective_restakes_view" CASCADE;--> statement-breakpoint
DROP VIEW IF EXISTS "public"."point_favor_history" CASCADE;--> statement-breakpoint
ALTER TABLE "doubt_history" ADD CONSTRAINT "doubt_history_doubt_id_doubts_id_fk" FOREIGN KEY ("doubt_id") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doubt_history" ADD CONSTRAINT "doubt_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "points"("id") ON DELETE cascade;
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "points"("id") ON DELETE cascade;

CREATE INDEX "doubt_history_doubt_idx" ON "doubt_history" USING btree ("doubt_id");--> statement-breakpoint
CREATE INDEX "doubt_history_user_idx" ON "doubt_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "doubts_user_idx" ON "doubts" ("user_id");
CREATE INDEX "doubts_point_idx" ON "doubts" ("point_id");
CREATE INDEX "doubts_negation_idx" ON "doubts" ("negation_id");
CREATE INDEX "doubt_history_point_idx" ON "doubt_history" ("point_id");
CREATE INDEX "doubt_history_negation_idx" ON "doubt_history" ("negation_id");
DROP VIEW IF EXISTS "public"."effective_restakes_view" CASCADE;--> statement-breakpoint
CREATE VIEW "public"."effective_restakes_view" AS (
  SELECT 
    r.user_id,
    r.point_id,
    r.negation_id,
    r.amount,
    COALESCE((
      SELECT s.amount
      FROM "slashes" s
      WHERE s.restake_id = r.id
      AND s.amount > 0 
      AND s.created_at > r.created_at
    ), 0) as slashed_amount,
    COALESCE((
      SELECT SUM(d.amount)
      FROM "doubts" d
      WHERE d.point_id = r.point_id
      AND d.negation_id = r.negation_id
    ), 0) as doubted_amount,
    GREATEST(0, r.amount - COALESCE((
      SELECT s.amount
      FROM "slashes" s
      WHERE s.restake_id = r.id
      AND s.amount > 0 
      AND s.created_at > r.created_at
    ), 0)) as effective_amount,
    r.amount > COALESCE((
      SELECT s.amount
      FROM "slashes" s
      WHERE s.restake_id = r.id
      AND s.amount > 0 
      AND s.created_at > r.created_at
    ), 0) as is_active
  FROM "restakes" r
  WHERE r.amount > 0
);
DROP VIEW IF EXISTS "public"."point_favor_history" CASCADE;
CREATE VIEW "public"."point_favor_history" AS (with "all_events" as ((((((((select "id" as point_id, "created_at" as event_time, 'point_created' as event_type from "points") union (select "point_id" as point_id, "created_at" as event_time, 'endorsement_made' as event_type from "endorsements")) union (select "older_point_id" as point_id, "created_at" as event_time, 'negation_made' as event_type from "negations")) union (select "newer_point_id" as point_id, "created_at" as event_time, 'negation_made' as event_type from "negations")) union (select CASE 
              WHEN "negations"."older_point_id" = "endorsements"."point_id" 
              THEN "negations"."newer_point_id"
              ELSE "negations"."older_point_id"
            END as point_id, "endorsements"."created_at" as event_time, 'negation_endorsed' as event_type from "endorsements" left join "negations" on (
              ("negations"."older_point_id" = "endorsements"."point_id" OR 
               "negations"."newer_point_id" = "endorsements"."point_id")
              AND "negations"."created_at" <= "endorsements"."created_at"
            ))) union (select "restakes"."point_id" as point_id, "restake_history"."created_at" as event_time, 'restake_modified' as event_type from "restake_history" inner join "restakes" on "restake_history"."restake_id" = "restakes"."id")) union (select "restakes"."point_id" as point_id, "slash_history"."created_at" as event_time, 'slash_modified' as event_type from "slash_history" inner join "slashes" on "slash_history"."slash_id" = "slashes"."id" inner join "restakes" on "slashes"."restake_id" = "restakes"."id")) union (select "id" as point_id, NOW() as event_time, 'favor_queried' as event_type from "points")) select "all_events_with_stats".point_id as "point_id", "all_events_with_stats".event_type as "event_type", "all_events_with_stats".event_time as "event_time", "all_events_with_stats".cred as "cred", "all_events_with_stats".negations_cred as "negations_cred", CAST(
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
      AS NUMERIC) as "favor" from (select "all_events".point_id as "point_id", "all_events".event_type as "event_type", "all_events".event_time as "event_time", 
          COALESCE((
            SELECT SUM("cred")
            FROM "endorsements"
            WHERE "point_id" = "all_events".point_id
            AND "created_at" <= "all_events".event_time
          ), 0)
         as "cred", 
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
         as "negations_cred" from "all_events") "all_events_with_stats" order by "all_events_with_stats".event_time, "all_events_with_stats".point_id);