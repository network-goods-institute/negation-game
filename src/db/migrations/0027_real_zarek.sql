CREATE TYPE "public"."restake_action" AS ENUM('created', 'increased', 'decreased', 'deactivated');--> statement-breakpoint
CREATE TABLE "restake_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"restake_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"action" "restake_action" NOT NULL,
	"previous_amount" integer,
	"new_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restakes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "unique_active_restake" UNIQUE("user_id","point_id","negation_id"),
	CONSTRAINT "point_order_constraint" CHECK ("restakes"."point_id" < "restakes"."negation_id"),
	CONSTRAINT "amount_positive_constraint" CHECK ("restakes"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "restake_history" ADD CONSTRAINT "restake_history_restake_id_restakes_id_fk" FOREIGN KEY ("restake_id") REFERENCES "public"."restakes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restake_history" ADD CONSTRAINT "restake_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restake_history" ADD CONSTRAINT "restake_history_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restake_history" ADD CONSTRAINT "restake_history_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restakes" ADD CONSTRAINT "restakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restakes" ADD CONSTRAINT "restakes_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restakes" ADD CONSTRAINT "restakes_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "restake_history_restake_idx" ON "restake_history" USING btree ("restake_id");--> statement-breakpoint
CREATE INDEX "restake_history_user_idx" ON "restake_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "restake_history_point_idx" ON "restake_history" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX "restake_history_negation_idx" ON "restake_history" USING btree ("negation_id");--> statement-breakpoint
CREATE INDEX "active_restake_idx" ON "restakes" USING btree ("user_id","point_id","negation_id","active");--> statement-breakpoint
CREATE INDEX "restakes_user_idx" ON "restakes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "restakes_point_idx" ON "restakes" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX "restakes_negation_idx" ON "restakes" USING btree ("negation_id");