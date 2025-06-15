ALTER TABLE "notifications" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "notification_preferences" DROP COLUMN "email_notifications";