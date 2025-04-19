ALTER TABLE "chats" ADD COLUMN "state_hash" text;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "is_shared" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "share_id" text;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_share_id_unique" UNIQUE("share_id");