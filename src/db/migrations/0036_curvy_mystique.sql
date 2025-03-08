ALTER TABLE "points" ADD COLUMN "is_command" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN "pinned_point_id" integer;