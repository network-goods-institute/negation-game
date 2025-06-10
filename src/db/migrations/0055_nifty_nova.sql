CREATE TYPE "public"."digest_frequency" AS ENUM('none', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('endorsement', 'negation', 'restake', 'doubt', 'slash', 'rationale_mention', 'message', 'viewpoint_published', 'scroll_proposal');--> statement-breakpoint
CREATE TYPE "public"."source_entity_type" AS ENUM('point', 'rationale', 'chat', 'viewpoint', 'proposal', 'user');--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"endorsement_notifications" boolean DEFAULT true NOT NULL,
	"negation_notifications" boolean DEFAULT true NOT NULL,
	"restake_notifications" boolean DEFAULT true NOT NULL,
	"rationale_notifications" boolean DEFAULT true NOT NULL,
	"message_notifications" boolean DEFAULT true NOT NULL,
	"scroll_proposal_notifications" boolean DEFAULT false NOT NULL,
	"digest_frequency" "digest_frequency" DEFAULT 'daily' NOT NULL,
	"email_notifications" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" "notification_type" NOT NULL,
	"source_user_id" varchar,
	"source_entity_id" varchar,
	"source_entity_type" "source_entity_type",
	"title" varchar(255) NOT NULL,
	"content" text,
	"metadata" jsonb,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"space" varchar NOT NULL
);
