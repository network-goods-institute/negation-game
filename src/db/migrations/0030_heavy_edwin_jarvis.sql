CREATE VIEW "public"."effective_restakes_view" AS (select "user_id", "point_id", "negation_id", "amount", 
        COALESCE((
          SELECT SUM("amount")
          FROM "slashes"
          WHERE "user_id" = "user_id"
            AND "point_id" = "point_id"
            AND "negation_id" = "negation_id"
            AND "active" = true
        ), 0)
       as "slashed_amount", 
        "amount" - COALESCE((
          SELECT SUM("amount")
          FROM "slashes"
          WHERE "user_id" = "user_id"
            AND "point_id" = "point_id"
            AND "negation_id" = "negation_id"
            AND "active" = true
        ), 0)
       as "effective_amount", 
        "active" AND (
          "amount" > COALESCE((
            SELECT SUM("amount")
            FROM "slashes"
            WHERE "user_id" = "user_id"
              AND "point_id" = "point_id"
              AND "negation_id" = "negation_id"
              AND "active" = true
          ), 0)
        )
       as "is_active" from "restakes" where "restakes"."active" = true);