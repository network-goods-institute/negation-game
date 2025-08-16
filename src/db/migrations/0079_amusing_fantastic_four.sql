ALTER TABLE "messages" ADD COLUMN "sequence_number" bigserial NOT NULL;--> statement-breakpoint
CREATE INDEX "messages_sequence_idx" ON "messages" USING btree ("sequence_number");