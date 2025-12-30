CREATE TABLE "mp_doc_pins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mp_doc_pins" ADD CONSTRAINT "mp_doc_pins_doc_id_mp_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."mp_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_doc_pins_doc_idx" ON "mp_doc_pins" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "mp_doc_pins_user_idx" ON "mp_doc_pins" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_doc_pins_user_doc_uniq" ON "mp_doc_pins" USING btree ("user_id","doc_id");