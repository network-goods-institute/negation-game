-- Yjs storage migration: move to binary updates, add doc snapshot cache
-- Idempotent, probably safe to re-run

-- 1) Ensure update_bin column (bytea) exists for raw Yjs updates
ALTER TABLE "mp_doc_updates"
  ADD COLUMN IF NOT EXISTS "update_bin" bytea;

-- 2) If legacy text column "update" exists, backfill binary from base64 text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mp_doc_updates'
      AND column_name = 'update'
  ) THEN
    -- Backfill only where update_bin is NULL and legacy update has data
    EXECUTE $$
      UPDATE "mp_doc_updates"
         SET "update_bin" = decode("update", 'base64')
       WHERE "update_bin" IS NULL
         AND "update" IS NOT NULL
         AND "update" <> ''
    $$;
  END IF;
END $$;

-- 3) Drop the legacy text column if present (now redundant)
ALTER TABLE "mp_doc_updates"
  DROP COLUMN IF EXISTS "update";

-- 4) Ensure helpful read index (may already exist)
CREATE INDEX IF NOT EXISTS "mp_doc_updates_doc_id_created_at_idx"
  ON "mp_doc_updates" USING btree ("doc_id", "created_at");

-- 5) Add snapshot caching columns to mp_docs
ALTER TABLE "mp_docs"
  ADD COLUMN IF NOT EXISTS "snapshot" bytea,
  ADD COLUMN IF NOT EXISTS "state_vector" bytea,
  ADD COLUMN IF NOT EXISTS "snapshot_at" timestamp with time zone;

