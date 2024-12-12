DROP VIEW "public"."effective_restakes_view";--> statement-breakpoint
CREATE VIEW "public"."effective_restakes_view" AS (
  SELECT 
    "restakes"."user_id",
    "restakes"."point_id",
    "restakes"."negation_id",
    "restakes"."amount",
    COALESCE((
      SELECT "slashes"."amount"
      FROM "slashes"
      WHERE "slashes"."restake_id" = "restakes"."id"
      AND "slashes"."amount" > 0 
      AND "slashes"."created_at" > "restakes"."created_at"
    ), 0) as "slashed_amount",
    "restakes"."amount" - COALESCE((
      SELECT "slashes"."amount"
      FROM "slashes"
      WHERE "slashes"."restake_id" = "restakes"."id"
      AND "slashes"."amount" > 0 
      AND "slashes"."created_at" > "restakes"."created_at"
    ), 0) as "effective_amount",
    "restakes"."amount" > COALESCE((
      SELECT "slashes"."amount"
      FROM "slashes"
      WHERE "slashes"."restake_id" = "restakes"."id"
      AND "slashes"."amount" > 0 
      AND "slashes"."created_at" > "restakes"."created_at"
    ), 0) as "is_active"
  FROM "restakes"
  WHERE "restakes"."amount" > 0
);