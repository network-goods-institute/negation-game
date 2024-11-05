CREATE SEQUENCE "public"."guest" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET DEFAULT 'guest_' || nextval('guest')::text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_guest" boolean DEFAULT true NOT NULL;