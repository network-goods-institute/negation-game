CREATE TABLE "viewpoints" (
	"id" varchar PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"graph" jsonb NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"space" varchar DEFAULT 'global'
);
--> statement-breakpoint
ALTER TABLE "viewpoints" ADD CONSTRAINT "viewpoints_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;