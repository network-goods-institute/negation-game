-- Users and Viewpoints Table Improvements Migration

-- Step 1: Drop dependent tables and constraints first
ALTER TABLE "user_conversation_preferences" DISABLE ROW LEVEL SECURITY;
DROP TABLE "user_conversation_preferences" CASCADE;

-- Step 2: Drop all existing foreign key constraints that reference users.id
ALTER TABLE "viewpoints" DROP CONSTRAINT IF EXISTS "viewpoints_copied_from_id_viewpoints_id_fk";
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_sender_id_users_id_fk";
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_recipient_id_users_id_fk";
ALTER TABLE "objections" DROP CONSTRAINT IF EXISTS "objections_created_by_users_id_fk";
ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "chats_user_id_users_id_fk";
ALTER TABLE "doubt_history" DROP CONSTRAINT IF EXISTS "doubt_history_user_id_users_id_fk";
ALTER TABLE "doubts" DROP CONSTRAINT IF EXISTS "doubts_user_id_users_id_fk";
ALTER TABLE "restake_history" DROP CONSTRAINT IF EXISTS "restake_history_user_id_users_id_fk";
ALTER TABLE "restakes" DROP CONSTRAINT IF EXISTS "restakes_user_id_users_id_fk";
ALTER TABLE "slash_history" DROP CONSTRAINT IF EXISTS "slash_history_user_id_users_id_fk";
ALTER TABLE "slashes" DROP CONSTRAINT IF EXISTS "slashes_user_id_users_id_fk";
ALTER TABLE "negations" DROP CONSTRAINT IF EXISTS "negations_created_by_users_id_fk";
ALTER TABLE "endorsements" DROP CONSTRAINT IF EXISTS "endorsements_user_id_users_id_fk";

-- Step 3: Drop indexes that will be recreated
DROP INDEX IF EXISTS "usernameUniqueIndex";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "usernameFormat";

-- Step 4: Modify users table structure (primary key will be maintained automatically)
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE varchar(255);
ALTER TABLE "users" ALTER COLUMN "username" SET DATA TYPE varchar(15);
ALTER TABLE "users" ALTER COLUMN "cred" SET DATA TYPE bigint;
ALTER TABLE "users" ALTER COLUMN "cred" SET DEFAULT 500;
ALTER TABLE "users" ALTER COLUMN "bio" SET DATA TYPE varchar(1000);

-- Step 5: Add new columns to users table
ALTER TABLE "users" ADD COLUMN "username_canonical" varchar(15);
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;

-- Step 6: Populate username_canonical for existing records
UPDATE "users" SET "username_canonical" = LOWER("username") WHERE "username_canonical" IS NULL;
ALTER TABLE "users" ALTER COLUMN "username_canonical" SET NOT NULL;

-- Step 7: Modify viewpoint_interactions table
ALTER TABLE "viewpoint_interactions" ALTER COLUMN "viewpoint_id" SET DATA TYPE varchar(255);
ALTER TABLE "viewpoint_interactions" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;

-- Step 8: Modify viewpoints table structure (primary key will be maintained automatically)
ALTER TABLE "viewpoints" ALTER COLUMN "id" SET DATA TYPE varchar(255);
ALTER TABLE "viewpoints" ALTER COLUMN "title" SET DATA TYPE varchar(200);
ALTER TABLE "viewpoints" ALTER COLUMN "content" SET DATA TYPE varchar(2000);
ALTER TABLE "viewpoints" ALTER COLUMN "content" SET DEFAULT '';
ALTER TABLE "viewpoints" ALTER COLUMN "created_by" SET DATA TYPE varchar(255);
ALTER TABLE "viewpoints" ALTER COLUMN "space" SET DATA TYPE varchar(100);
ALTER TABLE "viewpoints" ALTER COLUMN "copied_from_id" SET DATA TYPE varchar(255);

-- Step 9: Add new columns to viewpoints table
ALTER TABLE "viewpoints" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "viewpoints" ADD COLUMN "deleted_at" timestamp;
ALTER TABLE "viewpoints" ADD COLUMN "deleted_by" varchar(255);

-- Step 10: Recreate constraints and indexes
CREATE UNIQUE INDEX "usernameUniqueIndex" ON "users" USING btree ("username_canonical");

ALTER TABLE "users" ADD CONSTRAINT "maxCredCheck" CHECK ("users"."cred" <= 2147483647);
ALTER TABLE "users" ADD CONSTRAINT "softDeleteConsistency" CHECK (("users"."is_active" = true AND "users"."deleted_at" IS NULL) OR ("users"."is_active" = false AND "users"."deleted_at" IS NOT NULL));
ALTER TABLE "users" ADD CONSTRAINT "usernameFormat" CHECK (LENGTH("users"."username") BETWEEN 3 AND 15
          AND "users"."username_canonical" ~ '^[a-z0-9][_a-z0-9]*[a-z0-9]$');

-- Step 11: Add viewpoint_interactions constraints
ALTER TABLE "viewpoint_interactions" ADD CONSTRAINT "positive_views" CHECK ("viewpoint_interactions"."views" >= 0);
ALTER TABLE "viewpoint_interactions" ADD CONSTRAINT "positive_copies" CHECK ("viewpoint_interactions"."copies" >= 0);
ALTER TABLE "viewpoint_interactions" ADD CONSTRAINT "positive_version" CHECK ("viewpoint_interactions"."version" >= 1);

-- Step 12: Add viewpoints constraints
ALTER TABLE "viewpoints" ADD CONSTRAINT "title_length_check" CHECK (LENGTH("viewpoints"."title") >= 1 AND LENGTH("viewpoints"."title") <= 200);
ALTER TABLE "viewpoints" ADD CONSTRAINT "description_length_check" CHECK (LENGTH("viewpoints"."content") <= 2000);
ALTER TABLE "viewpoints" ADD CONSTRAINT "soft_delete_consistency" CHECK (("viewpoints"."is_active" = true AND "viewpoints"."deleted_at" IS NULL AND "viewpoints"."deleted_by" IS NULL) OR ("viewpoints"."is_active" = false AND "viewpoints"."deleted_at" IS NOT NULL));

-- Step 13: Recreate all foreign key constraints that reference users.id
DO $$ BEGIN
 ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "negations" ADD CONSTRAINT "negations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "slashes" ADD CONSTRAINT "slashes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "slash_history" ADD CONSTRAINT "slash_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "restakes" ADD CONSTRAINT "restakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "restake_history" ADD CONSTRAINT "restake_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "doubts" ADD CONSTRAINT "doubts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "doubt_history" ADD CONSTRAINT "doubt_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "objections" ADD CONSTRAINT "objections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Step 14: Add viewpoints foreign key constraints
DO $$ BEGIN
 ALTER TABLE "viewpoints" ADD CONSTRAINT "viewpoints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "viewpoints" ADD CONSTRAINT "viewpoints_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Step 15: Add self-referencing foreign key for viewpoints (must be done after viewpoints structure is complete)
DO $$ BEGIN
 ALTER TABLE "viewpoints" ADD CONSTRAINT "viewpoints_copied_from_id_viewpoints_id_fk" FOREIGN KEY ("copied_from_id") REFERENCES "public"."viewpoints"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Step 16: Create performance indexes
CREATE INDEX IF NOT EXISTS "viewpoint_interactions_last_viewed_idx" ON "viewpoint_interactions" USING btree ("last_viewed");
CREATE INDEX IF NOT EXISTS "viewpoint_interactions_last_updated_idx" ON "viewpoint_interactions" USING btree ("last_updated");
CREATE INDEX IF NOT EXISTS "viewpoint_interactions_views_idx" ON "viewpoint_interactions" USING btree ("views");
CREATE INDEX IF NOT EXISTS "viewpoint_interactions_copies_idx" ON "viewpoint_interactions" USING btree ("copies");
CREATE INDEX IF NOT EXISTS "viewpoints_created_by_idx" ON "viewpoints" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "viewpoints_space_idx" ON "viewpoints" USING btree ("space");
CREATE INDEX IF NOT EXISTS "viewpoints_active_idx" ON "viewpoints" USING btree ("is_active","deleted_at");
CREATE INDEX IF NOT EXISTS "viewpoints_topic_idx" ON "viewpoints" USING btree ("topic_id");