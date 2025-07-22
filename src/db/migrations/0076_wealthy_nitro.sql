CREATE TABLE "rationale_points" (
	"rationale_id" varchar(255) NOT NULL,
	"point_id" integer NOT NULL,
	CONSTRAINT "rationale_points_rationale_id_point_id_pk" PRIMARY KEY("rationale_id","point_id")
);
--> statement-breakpoint
ALTER TABLE "rationale_points" ADD CONSTRAINT "rationale_points_rationale_id_viewpoints_id_fk" FOREIGN KEY ("rationale_id") REFERENCES "public"."viewpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rationale_points" ADD CONSTRAINT "rationale_points_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rationale_points_rationale_idx" ON "rationale_points" USING btree ("rationale_id");--> statement-breakpoint
CREATE INDEX "rationale_points_point_idx" ON "rationale_points" USING btree ("point_id");