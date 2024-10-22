ALTER TABLE "negations" ADD CONSTRAINT "olderPointFirst" CHECK ("negations"."older_point_id" < "negations"."newer_point_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "noNegativeCred" CHECK ("users"."cred" >= 0);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "usernameFormat" CHECK (LENGTH("users"."username") BETWEEN 4 AND 15
        AND "users"."username" ~ '^[a-zA-Z0-9][_a-zA-Z0-9]+[a-zA-Z0-9]$');