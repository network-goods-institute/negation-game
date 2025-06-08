CREATE TABLE "objections" (
	"id" serial PRIMARY KEY NOT NULL,
	"objection_point_id" integer NOT NULL,
	"target_point_id" integer NOT NULL,
	"context_point_id" integer NOT NULL,
	"parent_edge_id" integer NOT NULL,
	"endorsement_id" integer NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"space" varchar NOT NULL,
	CONSTRAINT "uniqueObjection" UNIQUE("objection_point_id","target_point_id","context_point_id","parent_edge_id")
);
--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_objection_point_id_points_id_fk" FOREIGN KEY ("objection_point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_target_point_id_points_id_fk" FOREIGN KEY ("target_point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_context_point_id_points_id_fk" FOREIGN KEY ("context_point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_parent_edge_id_negations_id_fk" FOREIGN KEY ("parent_edge_id") REFERENCES "public"."negations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_endorsement_id_endorsements_id_fk" FOREIGN KEY ("endorsement_id") REFERENCES "public"."endorsements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objections" ADD CONSTRAINT "objections_space_spaces_space_id_fk" FOREIGN KEY ("space") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "objectionPointIndex" ON "objections" USING btree ("objection_point_id");--> statement-breakpoint
CREATE INDEX "targetPointIndex" ON "objections" USING btree ("target_point_id");--> statement-breakpoint
CREATE INDEX "contextPointIndex" ON "objections" USING btree ("context_point_id");--> statement-breakpoint
CREATE INDEX "parentEdgeIndex" ON "objections" USING btree ("parent_edge_id");--> statement-breakpoint
ALTER TABLE "negations" DROP COLUMN "is_objection";