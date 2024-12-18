CREATE TABLE IF NOT EXISTS "spaces" (
	"space_id" varchar PRIMARY KEY NOT NULL
);

--> statement-breakpoint
INSERT INTO "spaces" ("space_id") VALUES ('global');

--> statement-breakpoint
ALTER TABLE "definitions" ADD COLUMN "space" varchar DEFAULT 'global';--> statement-breakpoint
ALTER TABLE "embeddings" ADD COLUMN "space" varchar DEFAULT 'global';--> statement-breakpoint
ALTER TABLE "endorsements" ADD COLUMN "space" varchar DEFAULT 'global';--> statement-breakpoint
ALTER TABLE "negations" ADD COLUMN "space" varchar DEFAULT 'global';--> statement-breakpoint
ALTER TABLE "points" ADD COLUMN "space" varchar DEFAULT 'global';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "definitions" ADD CONSTRAINT "definitions_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "negations" ADD CONSTRAINT "negations_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "points" ADD CONSTRAINT "points_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
