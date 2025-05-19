CREATE TABLE IF NOT EXISTS "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"space" varchar DEFAULT 'global' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"discourse_url" varchar(255) DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "viewpoints" ADD COLUMN IF NOT EXISTS "topic_id" integer;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT IF NOT EXISTS "topics_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewpoints" ADD CONSTRAINT IF NOT EXISTS "viewpoints_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;