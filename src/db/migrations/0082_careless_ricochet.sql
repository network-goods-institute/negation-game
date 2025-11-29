CREATE TABLE "mp_doc_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" text NOT NULL,
	"update" text NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mp_docs" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP VIEW IF EXISTS "public"."current_point_favor";--> statement-breakpoint
CREATE VIEW "public"."current_point_favor" AS (
  SELECT p."id",
    COALESCE((
      SELECT SUM(e."cred")
      FROM "endorsements" e
      WHERE e."point_id" = p."id"
    ), 0) AS "cred",
    COALESCE((
      SELECT SUM(e2."cred")
      FROM "endorsements" e2
      WHERE e2."point_id" IN (
        SELECT n."newer_point_id"
        FROM "negations" n
        WHERE n."older_point_id" = p."id" AND n."is_active" = true
        UNION
        SELECT n2."older_point_id"
        FROM "negations" n2
        WHERE n2."newer_point_id" = p."id" AND n2."is_active" = true
      )
    ), 0) AS "negations_cred",
    COALESCE((
      SELECT SUM(GREATEST(0, er."amount" - GREATEST(er."slashed_amount", er."doubted_amount")))
      FROM "effective_restakes_view" er
      WHERE er."point_id" = p."id"
    ), 0) AS "restake_bonus",
    (
      CASE
        WHEN COALESCE((
          SELECT SUM(e3."cred")
          FROM "endorsements" e3
          WHERE e3."point_id" = p."id"
        ), 0) = 0 THEN 0
        WHEN COALESCE((
          SELECT SUM(e4."cred")
          FROM "endorsements" e4
          WHERE e4."point_id" IN (
            SELECT n3."newer_point_id" FROM "negations" n3 WHERE n3."older_point_id" = p."id" AND n3."is_active" = true
            UNION
            SELECT n4."older_point_id" FROM "negations" n4 WHERE n4."newer_point_id" = p."id" AND n4."is_active" = true
          )
        ), 0) = 0 THEN 100
        ELSE FLOOR(
          100.0 * COALESCE((
            SELECT SUM(e5."cred")
            FROM "endorsements" e5
            WHERE e5."point_id" = p."id"
          ), 0) /
          (
            COALESCE((
              SELECT SUM(e6."cred")
              FROM "endorsements" e6
              WHERE e6."point_id" = p."id"
            ), 0) +
            COALESCE((
              SELECT SUM(e7."cred")
              FROM "endorsements" e7
              WHERE e7."point_id" IN (
                SELECT n5."newer_point_id" FROM "negations" n5 WHERE n5."older_point_id" = p."id" AND n5."is_active" = true
                UNION
                SELECT n6."older_point_id" FROM "negations" n6 WHERE n6."newer_point_id" = p."id" AND n6."is_active" = true
              )
            ), 0)
          )
        )
      END
    ) + COALESCE((
      SELECT SUM(GREATEST(0, er2."amount" - GREATEST(er2."slashed_amount", er2."doubted_amount")))
      FROM "effective_restakes_view" er2
      WHERE er2."point_id" = p."id"
    ), 0)::integer AS "favor"
  FROM "points" p
  WHERE p."is_active" = true
);--> statement-breakpoint
ALTER TABLE "mp_doc_updates" ADD CONSTRAINT "mp_doc_updates_doc_id_mp_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."mp_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint