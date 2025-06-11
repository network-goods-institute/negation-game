CREATE TABLE "user_conversation_preferences" (
	"user_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_conversation_preferences_user_id_conversation_id_pk" PRIMARY KEY("user_id","conversation_id")
);
--> statement-breakpoint
ALTER TABLE "user_conversation_preferences" ADD CONSTRAINT "user_conversation_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;