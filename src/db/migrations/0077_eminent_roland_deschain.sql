ALTER TABLE "snapshots" DROP CONSTRAINT "snapshots_bucket_id_topics_id_fk";
--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_bucket_id_topics_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;