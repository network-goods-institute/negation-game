DROP VIEW "public"."effective_restakes_view";--> statement-breakpoint
CREATE VIEW "public"."effective_restakes_view" AS (select "user_id", "point_id", "negation_id", "amount", 
        COALESCE((
          SELECT amount 
          FROM "slashes" s 
          WHERE s.restake_id = "id"
          AND s.amount > 0 
          AND s.created_at > "created_at"
        ), 0)
       as "slashed_amount", 
        "amount" - COALESCE((
          SELECT amount 
          FROM "slashes" s 
          WHERE s.restake_id = "id"
          AND s.amount > 0 
          AND s.created_at > "created_at"
        ), 0)
       as "effective_amount", 
        "amount" > COALESCE((
          SELECT amount 
          FROM "slashes" s 
          WHERE s.restake_id = "id"
          AND s.amount > 0 
          AND s.created_at > "created_at"
        ), 0)
       as "is_active" from "restakes" where "restakes"."amount" > 0);