ALTER TABLE "users" ALTER COLUMN "username" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_guest";--> statement-breakpoint
DROP SEQUENCE "public"."guest";