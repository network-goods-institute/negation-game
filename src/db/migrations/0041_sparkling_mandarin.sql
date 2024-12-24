DROP VIEW "public"."point_with_details_view";--> statement-breakpoint
CREATE VIEW "public"."point_with_details_view" AS (select "id", "content", "created_at", "created_by", 
        COALESCE((
          SELECT cred
          FROM "endorsements"
          WHERE point_id = "points".id
          AND user_id = current_user
        ), 0)
       as "viewer_cred", 
        COALESCE((
          SELECT COUNT(*)
          FROM (
            SELECT older_point_id AS point_id FROM "negations"
            UNION ALL
            SELECT newer_point_id AS point_id FROM "negations"
          ) sub
          WHERE point_id = "points".id
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
            UNION
            SELECT older_point_id
            FROM "negations"
            WHERE newer_point_id = "points".id
          )
        ), 0)
       as "negations_cred", 
          ARRAY(
            SELECT older_point_id
            FROM "negations"
            WHERE newer_point_id = "points".id
            UNION
            SELECT newer_point_id
            FROM "negations"
            WHERE older_point_id = "points".id
          )
         as "negation_ids" from "points");