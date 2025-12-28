CREATE TYPE "public"."mp_notification_type" AS ENUM('support', 'negation', 'objection', 'comment', 'upvote');--> statement-breakpoint
CREATE TABLE "mp_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"doc_id" text NOT NULL,
	"node_id" text,
	"edge_id" text,
	"type" "mp_notification_type" NOT NULL,
	"action" text,
	"actor_user_id" varchar,
	"actor_username" varchar,
	"title" text NOT NULL,
	"content" text,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mp_notifications_user_idx" ON "mp_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mp_notifications_doc_idx" ON "mp_notifications" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "mp_notifications_read_idx" ON "mp_notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "mp_notifications_created_idx" ON "mp_notifications" USING btree ("created_at");