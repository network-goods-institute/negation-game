CREATE TABLE "mp_mindchange" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_id" text NOT NULL,
	"edge_id" text NOT NULL,
	"user_id" text NOT NULL,
	"forward_value" integer NOT NULL,
	"backward_value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mp_mindchange" ADD CONSTRAINT "mp_mindchange_doc_id_mp_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."mp_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_mindchange_doc_edge_idx" ON "mp_mindchange" USING btree ("doc_id","edge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_mindchange_doc_edge_user_uidx" ON "mp_mindchange" USING btree ("doc_id","edge_id","user_id");