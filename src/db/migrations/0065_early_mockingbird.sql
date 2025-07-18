DROP INDEX IF EXISTS "uniqueTermIndex";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniqueTermIndex" ON "definitions" USING btree (("space" || '-' || lower("term")));--> statement-breakpoint
DROP VIEW IF EXISTS "public"."point_with_details_view";--> statement-breakpoint
CREATE VIEW "public"."point_with_details_view" AS (select "id", "content", "created_at", "created_by", "space", "is_command", "is_active", "deleted_at", "deleted_by", 
        COALESCE((
          SELECT COUNT(*)
          FROM (
            SELECT older_point_id AS point_id FROM "negations"
            WHERE "is_active" = true
            UNION ALL
            SELECT newer_point_id AS point_id FROM "negations"
            WHERE "is_active" = true
          ) sub
          WHERE sub.point_id = "points".id
        ), 0)
       as "amount_negations", 
        COALESCE((
          SELECT COUNT(DISTINCT "user_id")
          FROM "endorsements"
          WHERE "point_id" = "points".id
        ), 0)
       as "amount_supporters", 
        COALESCE((
          SELECT SUM("cred")
          FROM "endorsements"
          WHERE "point_id" = "points".id
        ), 0)
       as "cred", 
        COALESCE((
          SELECT SUM("cred")
          FROM "endorsements"
          WHERE "point_id" IN (
            SELECT newer_point_id
            FROM "negations"
            WHERE older_point_id = "points".id
            AND "is_active" = true
            UNION
            SELECT older_point_id
            FROM "negations"
            WHERE newer_point_id = "points".id
            AND "is_active" = true
          )
        ), 0)
       as "negations_cred", 
          ARRAY(
            SELECT older_point_id
            FROM "negations"
            WHERE newer_point_id = "points".id
            AND "is_active" = true
            UNION ALL
            SELECT newer_point_id
            FROM "negations"
            WHERE older_point_id = "points".id
            AND "is_active" = true
          )
         as "negation_ids" from "points" where "points"."is_active" = true);