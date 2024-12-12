DROP VIEW "public"."effective_restakes_view";--> statement-breakpoint
ALTER TABLE "restakes" DROP CONSTRAINT "unique_active_restake";--> statement-breakpoint
ALTER TABLE "slashes" DROP CONSTRAINT "unique_active_slash";--> statement-breakpoint
ALTER TABLE "restakes" DROP CONSTRAINT "amount_positive_constraint";--> statement-breakpoint
ALTER TABLE "slashes" DROP CONSTRAINT "amount_positive_constraint";--> statement-breakpoint
DROP INDEX "active_restake_idx";--> statement-breakpoint
ALTER TABLE "slashes" ADD COLUMN "restake_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "slashes" ADD CONSTRAINT "slashes_restake_id_restakes_id_fk" FOREIGN KEY ("restake_id") REFERENCES "public"."restakes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "slashes_restake_idx" ON "slashes" USING btree ("restake_id");--> statement-breakpoint
ALTER TABLE "restakes" DROP COLUMN "active";--> statement-breakpoint
ALTER TABLE "slashes" DROP COLUMN "active";--> statement-breakpoint
ALTER TABLE "restakes" ADD CONSTRAINT "unique_restake" UNIQUE("user_id","point_id","negation_id");--> statement-breakpoint
ALTER TABLE "slashes" ADD CONSTRAINT "unique_slash" UNIQUE("user_id","restake_id");--> statement-breakpoint
ALTER TABLE "restakes" ADD CONSTRAINT "amount_non_negative_constraint" CHECK ("restakes"."amount" >= 0);--> statement-breakpoint
ALTER TABLE "slashes" ADD CONSTRAINT "amount_non_negative_constraint" CHECK ("slashes"."amount" >= 0);--> statement-breakpoint
CREATE VIEW "public"."effective_restakes_view" AS (select "user_id", "point_id", "negation_id", "amount", 
        COALESCE((
          SELECT SUM("amount")
          FROM "slashes"
          WHERE "user_id" = "user_id"
            AND "point_id" = "point_id"
            AND "negation_id" = "negation_id"
            AND "amount" > 0
            AND "created_at" > "created_at"
        ), 0)
       as "slashed_amount", 
        "amount" - COALESCE((
          SELECT SUM("amount")
          FROM "slashes"
          WHERE "user_id" = "user_id"
            AND "point_id" = "point_id"
            AND "negation_id" = "negation_id"
            AND "amount" > 0
            AND "created_at" > "created_at"
        ), 0)
       as "effective_amount", 
        "amount" > COALESCE((
          SELECT SUM("amount")
          FROM "slashes"
          WHERE "user_id" = "user_id"
            AND "point_id" = "point_id"
            AND "negation_id" = "negation_id"
            AND "amount" > 0
            AND "created_at" > "created_at"
        ), 0)
       as "is_active" from "restakes" where "restakes"."amount" > 0);