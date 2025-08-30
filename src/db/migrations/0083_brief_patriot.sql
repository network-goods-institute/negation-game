-- Idempotent setup for initial Yjs binary and titles
ALTER TABLE "mp_doc_updates" ADD COLUMN IF NOT EXISTS "update_bin" bytea;--> statement-breakpoint
ALTER TABLE "mp_docs" ADD COLUMN IF NOT EXISTS "title" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mp_doc_updates_doc_id_created_at_idx" ON "mp_doc_updates" USING btree ("doc_id","created_at");--> statement-breakpoint
ALTER TABLE "mp_doc_updates" DROP COLUMN IF EXISTS "update";