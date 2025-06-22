CREATE TABLE "daily_stances" (
	"snap_day" date NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"point_id" integer NOT NULL,
	"z_value" double precision NOT NULL,
	CONSTRAINT "daily_stances_snap_day_user_id_point_id_pk" PRIMARY KEY("snap_day","user_id","point_id")
);
--> statement-breakpoint
CREATE TABLE "point_clusters" (
	"root_id" integer NOT NULL,
	"point_id" integer NOT NULL,
	"depth" integer NOT NULL,
	"sign" smallint NOT NULL,
	CONSTRAINT "point_clusters_pk" PRIMARY KEY("root_id","point_id"),
	CONSTRAINT "sign_is_valid" CHECK ("point_clusters"."sign" IN (-1, 1))
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"snap_day" date NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"point_id" integer NOT NULL,
	"endorse" integer DEFAULT 0 NOT NULL,
	"restake_live" integer DEFAULT 0 NOT NULL,
	"doubt" integer DEFAULT 0 NOT NULL,
	"sign" smallint NOT NULL,
	"bucket_id" integer,
	CONSTRAINT "snapshots_snap_day_user_id_point_id_pk" PRIMARY KEY("snap_day","user_id","point_id")
);
--> statement-breakpoint
ALTER TABLE "daily_stances" ADD CONSTRAINT "daily_stances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_stances" ADD CONSTRAINT "daily_stances_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_clusters" ADD CONSTRAINT "point_clusters_root_id_points_id_fk" FOREIGN KEY ("root_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_clusters" ADD CONSTRAINT "point_clusters_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_point_id_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_bucket_id_topics_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_stances_user_idx" ON "daily_stances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "point_clusters_root_idx" ON "point_clusters" USING btree ("root_id");--> statement-breakpoint
CREATE INDEX "point_clusters_depth_idx" ON "point_clusters" USING btree ("depth");--> statement-breakpoint
CREATE INDEX "snapshots_point_day_idx" ON "snapshots" USING btree ("point_id","snap_day");--> statement-breakpoint
CREATE INDEX "snapshots_user_idx" ON "snapshots" USING btree ("user_id");