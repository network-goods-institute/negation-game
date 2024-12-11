CREATE TYPE "public"."slash_action" AS ENUM('created', 'increased', 'decreased', 'deactivated');--> statement-breakpoint
CREATE TABLE "slash_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"slash_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"action" "slash_action" NOT NULL,
	"previous_amount" integer,
	"new_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slashes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"point_id" integer NOT NULL,
	"negation_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "unique_active_slash" UNIQUE("user_id","point_id","negation_id"),
	CONSTRAINT "amount_positive_constraint" CHECK ("slashes"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "slash_history" ADD CONSTRAINT "slash_history_slash_id_slashes_id_fk" FOREIGN KEY ("slash_id") REFERENCES "public"."slashes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slash_history" ADD CONSTRAINT "slash_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slash_history" ADD CONSTRAINT "slash_history_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slash_history" ADD CONSTRAINT "slash_history_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slashes" ADD CONSTRAINT "slashes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slashes" ADD CONSTRAINT "slashes_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slashes" ADD CONSTRAINT "slashes_negation_id_points_id_fk" FOREIGN KEY ("negation_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "slash_history_slash_idx" ON "slash_history" USING btree ("slash_id");--> statement-breakpoint
CREATE INDEX "slash_history_user_idx" ON "slash_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "slash_history_point_idx" ON "slash_history" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX "slash_history_negation_idx" ON "slash_history" USING btree ("negation_id");--> statement-breakpoint
CREATE INDEX "slashes_user_idx" ON "slashes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "slashes_point_idx" ON "slashes" USING btree ("point_id");--> statement-breakpoint
CREATE INDEX "slashes_negation_idx" ON "slashes" USING btree ("negation_id");