CREATE TABLE "space_admins" (
	"space_id" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "space_admins_space_id_user_id_pk" PRIMARY KEY("space_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "topic_assignments" (
	"topic_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topic_assignments_topic_id_user_id_pk" PRIMARY KEY("topic_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "topic_permissions" (
	"topic_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"can_create_rationale" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topic_permissions_topic_id_user_id_pk" PRIMARY KEY("topic_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "restricted_rationale_creation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "site_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "space_admins" ADD CONSTRAINT "space_admins_space_id_spaces_space_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("space_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_admins" ADD CONSTRAINT "space_admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_assignments" ADD CONSTRAINT "topic_assignments_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_assignments" ADD CONSTRAINT "topic_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_permissions" ADD CONSTRAINT "topic_permissions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_permissions" ADD CONSTRAINT "topic_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "space_admins_space_idx" ON "space_admins" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "space_admins_user_idx" ON "space_admins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "topic_assignments_topic_idx" ON "topic_assignments" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "topic_assignments_user_idx" ON "topic_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "topic_permissions_topic_idx" ON "topic_permissions" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "topic_permissions_user_idx" ON "topic_permissions" USING btree ("user_id");