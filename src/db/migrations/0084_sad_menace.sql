-- Private rationales: ownership + access tracking (idempotent)
ALTER TABLE "mp_docs" ADD COLUMN IF NOT EXISTS "owner_id" text;

-- Backfill existing docs to owner 'connormcmk'
UPDATE "mp_docs" SET "owner_id" = 'connormcmk' WHERE "owner_id" IS NULL;

-- Per-user access tracking for "My Rationales" ordering
CREATE TABLE IF NOT EXISTS "mp_doc_access" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "doc_id" text NOT NULL REFERENCES "mp_docs"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "last_open_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "mp_doc_access_user_idx" ON "mp_doc_access"("user_id");
CREATE INDEX IF NOT EXISTS "mp_doc_access_doc_idx" ON "mp_doc_access"("doc_id");
CREATE UNIQUE INDEX IF NOT EXISTS "mp_doc_access_user_doc_uniq" ON "mp_doc_access"("user_id","doc_id");
