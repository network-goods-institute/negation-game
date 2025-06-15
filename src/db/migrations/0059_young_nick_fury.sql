ALTER TABLE "messages" ADD COLUMN "read_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_read_receipts" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "receive_read_receipts" boolean DEFAULT true NOT NULL;