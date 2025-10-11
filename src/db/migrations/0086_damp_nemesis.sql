ALTER TABLE "mp_docs" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "mp_docs" ADD CONSTRAINT "mp_docs_slug_unique" UNIQUE("slug");