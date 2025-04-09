ALTER TABLE "users" ADD COLUMN "discourse_username" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discourse_community_url" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discourse_consent_given" boolean DEFAULT false NOT NULL;