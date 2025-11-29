CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "embeddings" (
	"point_id" serial PRIMARY KEY NOT NULL,
	"embedding" vector(384)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "endorsements" (
	"id" serial PRIMARY KEY NOT NULL,
	"cred" integer NOT NULL,
	"point_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "negations" (
	"id" serial PRIMARY KEY NOT NULL,
	"older_point_id" serial NOT NULL,
	"newer_point_id" serial NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniqueNegation" UNIQUE("older_point_id","newer_point_id"),
	CONSTRAINT "olderPointFirst" CHECK ("negations"."older_point_id" < "negations"."newer_point_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "points" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"username" varchar NOT NULL,
	"cred" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "noNegativeCred" CHECK ("users"."cred" >= 0),
	CONSTRAINT "usernameFormat" CHECK (LENGTH("users"."username") BETWEEN 4 AND 15
          AND "users"."username" ~ '^[a-zA-Z0-9][_a-zA-Z0-9]*[a-zA-Z0-9]$')
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "negations" ADD CONSTRAINT "negations_older_point_id_points_id_fk" FOREIGN KEY ("older_point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "negations" ADD CONSTRAINT "negations_newer_point_id_points_id_fk" FOREIGN KEY ("newer_point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "endorsements_user_id_index" ON "endorsements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "endorsements_point_id_index" ON "endorsements" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "olderPointIndex" ON "negations" USING btree ("older_point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "newerPointIndex" ON "negations" USING btree ("newer_point_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usernameUniqueIndex" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE VIEW "public"."point_endorsements_per_user_view" AS (select sum("cred") as "cred", "point_id", "user_id" from "endorsements" group by "endorsements"."point_id", "endorsements"."user_id");--> statement-breakpoint
CREATE VIEW "public"."point_negations_view" AS ((select "newer_point_id", "older_point_id", "id", "created_by", "created_at" from "negations") union (select "older_point_id", "newer_point_id", "id", "created_by", "created_at" from "negations"));