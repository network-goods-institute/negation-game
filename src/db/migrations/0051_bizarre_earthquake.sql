CREATE TABLE "translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_text" text NOT NULL,
	"language" varchar(10) NOT NULL,
	"translated_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_translation" ON "translations" USING btree ("original_text","language");