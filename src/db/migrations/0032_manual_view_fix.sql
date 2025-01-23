DROP VIEW "public"."effective_restakes_view";
CREATE VIEW "public"."effective_restakes_view" AS (
  SELECT 
    restakes."user_id",
    restakes."point_id",
    restakes."negation_id",
    restakes."amount",
    COALESCE((
      SELECT slashes."amount"
      FROM "slashes"
      WHERE slashes."restake_id" = restakes."id"
      AND slashes."amount" > 0 
      AND slashes."created_at" > restakes."created_at"
    ), 0) as "slashed_amount",
    COALESCE((
      SELECT SUM(doubts."amount")
      FROM "doubts"
      WHERE doubts."point_id" = restakes."point_id"
      AND doubts."negation_id" = restakes."negation_id"
    ), 0) as "doubted_amount",
    GREATEST(0, restakes."amount" - 
      COALESCE((
        SELECT slashes."amount"
        FROM "slashes"
        WHERE slashes."restake_id" = restakes."id"
        AND slashes."amount" > 0 
        AND slashes."created_at" > restakes."created_at"
      ), 0)
    ) as "effective_amount"
  FROM "restakes"
  WHERE restakes."amount" > 0
);