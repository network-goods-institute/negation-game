CREATE TABLE "rate_limits" (
	"id" varchar PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"reset_time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limits_reset_time_idx" ON "rate_limits" USING btree ("reset_time");