CREATE TABLE "rationale_assignments" (
	"id" varchar PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"space_id" varchar NOT NULL,
	"assigned_by" varchar NOT NULL,
	"prompt_message" text,
	"required" boolean DEFAULT false NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
