CREATE TABLE IF NOT EXISTS "experimental_graph_doc_points" (
	"doc_id" varchar(255) NOT NULL,
	"point_id" integer NOT NULL,
	CONSTRAINT "experimental_graph_doc_points_doc_id_point_id_pk" PRIMARY KEY("doc_id","point_id")
);
---> statement-breakpoint
CREATE TABLE IF NOT EXISTS "experimental_graph_docs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"space" varchar(100),
	"title" varchar(200) DEFAULT 'Untitled Experimental Rationale' NOT NULL,
	"doc" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
---> statement-breakpoint

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE constraint_name = 'experimental_graph_doc_points_doc_id_experimental_graph_docs_id_fk'
	) THEN
		ALTER TABLE "experimental_graph_doc_points" ADD CONSTRAINT "experimental_graph_doc_points_doc_id_experimental_graph_docs_id_fk"
		FOREIGN KEY ("doc_id") REFERENCES "public"."experimental_graph_docs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
	END IF;
END $$;
---> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE constraint_name = 'experimental_graph_doc_points_point_id_points_id_fk'
	) THEN
		ALTER TABLE "experimental_graph_doc_points" ADD CONSTRAINT "experimental_graph_doc_points_point_id_points_id_fk"
		FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
	END IF;
END $$;
---> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE constraint_name = 'experimental_graph_docs_space_spaces_space_id_fk'
	) THEN
		ALTER TABLE "experimental_graph_docs" ADD CONSTRAINT "experimental_graph_docs_space_spaces_space_id_fk"
		FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE CASCADE ON UPDATE NO ACTION;
	END IF;
END $$;
---> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE constraint_name = 'experimental_graph_docs_created_by_users_id_fk'
	) THEN
		ALTER TABLE "experimental_graph_docs" ADD CONSTRAINT "experimental_graph_docs_created_by_users_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
	END IF;
END $$;
---> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exp_doc_points_doc_idx" ON "experimental_graph_doc_points" USING btree ("doc_id");
---> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exp_doc_points_point_idx" ON "experimental_graph_doc_points" USING btree ("point_id");
---> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experimental_graph_docs_space_idx" ON "experimental_graph_docs" USING btree ("space");
---> statement-breakpoint

ALTER TABLE "experimental_graph_docs" ADD COLUMN IF NOT EXISTS "published_viewpoint_id" varchar(255);
---> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		WHERE constraint_name = 'experimental_graph_docs_published_viewpoint_id_viewpoints_id_fk'
	) THEN
		ALTER TABLE "experimental_graph_docs" ADD CONSTRAINT "experimental_graph_docs_published_viewpoint_id_viewpoints_id_fk"
		FOREIGN KEY ("published_viewpoint_id") REFERENCES "public"."viewpoints"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
	END IF;
END $$;
---> statement-breakpoint
CREATE INDEX IF NOT EXISTS "experimental_graph_docs_published_idx" ON "experimental_graph_docs" USING btree ("published_viewpoint_id");