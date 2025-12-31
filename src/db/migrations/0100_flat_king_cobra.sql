CREATE TABLE "mp_doc_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"requested_role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"resolved_role" text
);
--> statement-breakpoint
ALTER TABLE "mp_doc_access_requests" ADD CONSTRAINT "mp_doc_access_requests_doc_id_mp_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."mp_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_doc_access_requests_doc_idx" ON "mp_doc_access_requests" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "mp_doc_access_requests_requester_idx" ON "mp_doc_access_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "mp_doc_access_requests_status_idx" ON "mp_doc_access_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_doc_access_requests_doc_requester_uniq" ON "mp_doc_access_requests" USING btree ("doc_id","requester_id");