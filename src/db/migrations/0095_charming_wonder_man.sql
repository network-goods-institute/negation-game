CREATE TABLE "mp_doc_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mp_doc_share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" text NOT NULL,
	"token" text NOT NULL,
	"role" text NOT NULL,
	"require_login" boolean DEFAULT true NOT NULL,
	"grant_permanent_access" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mp_doc_permissions" ADD CONSTRAINT "mp_doc_permissions_doc_id_mp_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."mp_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_doc_share_links" ADD CONSTRAINT "mp_doc_share_links_doc_id_mp_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."mp_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mp_doc_permissions_doc_idx" ON "mp_doc_permissions" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "mp_doc_permissions_user_idx" ON "mp_doc_permissions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_doc_permissions_doc_user_uniq" ON "mp_doc_permissions" USING btree ("doc_id","user_id");--> statement-breakpoint
CREATE INDEX "mp_doc_share_links_doc_idx" ON "mp_doc_share_links" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "mp_doc_share_links_token_idx" ON "mp_doc_share_links" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_doc_share_links_token_uniq" ON "mp_doc_share_links" USING btree ("token");
