SET search_path TO public;--> statement-breakpoint
CREATE TYPE "public"."cred_event_kind" AS ENUM('ENDORSE', 'RESTAKE', 'SLASH', 'DOUBT');--> statement-breakpoint
CREATE TABLE "public"."cred_events" (
	"event_id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"point_id" integer NOT NULL,
	"kind" "cred_event_kind" NOT NULL,
	"amount" integer NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."cred_events" ADD CONSTRAINT "cred_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."cred_events" ADD CONSTRAINT "cred_events_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cred_events_user_idx" ON "public"."cred_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cred_events_point_idx" ON "public"."cred_events" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX "cred_events_ts_idx" ON "public"."cred_events" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "cred_events_kind_idx" ON "public"."cred_events" USING btree ("kind");