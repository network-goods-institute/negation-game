CREATE TABLE "viewpoint_interactions" (
	"viewpoint_id" varchar NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"copies" integer DEFAULT 0 NOT NULL,
	"last_viewed" timestamp DEFAULT now() NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "viewpoint_interactions_viewpoint_id_pk" PRIMARY KEY("viewpoint_id")
);
--> statement-breakpoint
ALTER TABLE "viewpoint_interactions" ADD CONSTRAINT "viewpoint_interactions_viewpoint_id_viewpoints_id_fk" FOREIGN KEY ("viewpoint_id") REFERENCES "public"."viewpoints"("id") ON DELETE cascade ON UPDATE no action;