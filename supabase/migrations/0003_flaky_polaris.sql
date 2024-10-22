CREATE TABLE IF NOT EXISTS "endorsements" (
	"id" serial PRIMARY KEY NOT NULL,
	"cred" integer NOT NULL,
	"point_id" serial NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cred" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "endorsements_user_id_index" ON "endorsements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "endorsements_point_id_index" ON "endorsements" USING btree ("point_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usernameUniqueIndex" ON "users" USING btree (lower("username"));