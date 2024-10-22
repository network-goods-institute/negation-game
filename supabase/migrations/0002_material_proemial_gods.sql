CREATE TABLE IF NOT EXISTS "negations" (
	"id" serial PRIMARY KEY NOT NULL,
	"older_point_id" serial NOT NULL,
	"newer_point_id" serial NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniqueNegation" UNIQUE("older_point_id","newer_point_id")
);
--> statement-breakpoint
ALTER TABLE "embeddings" DROP CONSTRAINT "embeddings_point_id_points_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "negations" ADD CONSTRAINT "negations_older_point_id_points_id_fk" FOREIGN KEY ("older_point_id") REFERENCES "public"."points"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "negations" ADD CONSTRAINT "negations_newer_point_id_points_id_fk" FOREIGN KEY ("newer_point_id") REFERENCES "public"."points"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "olderPointIndex" ON "negations" USING btree ("older_point_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "newerPointIndex" ON "negations" USING btree ("newer_point_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "points" DROP COLUMN IF EXISTS "title";