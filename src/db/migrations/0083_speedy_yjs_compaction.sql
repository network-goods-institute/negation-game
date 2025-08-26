-- Add index to optimize Yjs updates queries by doc and ordering
CREATE INDEX IF NOT EXISTS "mp_doc_updates_doc_id_created_at_idx" ON "mp_doc_updates" USING btree ("doc_id", "created_at");
