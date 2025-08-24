CREATE TABLE "mp_doc_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" text NOT NULL,
	"update" text NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mp_docs" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP VIEW "public"."current_point_favor";--> statement-breakpoint
ALTER TABLE "mp_doc_updates" ADD CONSTRAINT "mp_doc_updates_doc_id_mp_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."mp_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint