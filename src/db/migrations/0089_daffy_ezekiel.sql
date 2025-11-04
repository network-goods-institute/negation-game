CREATE TABLE "market_holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" text NOT NULL,
	"user_id" text NOT NULL,
	"security_id" text NOT NULL,
	"amount_scaled" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_state" (
	"doc_id" text PRIMARY KEY NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" text NOT NULL,
	"user_id" text NOT NULL,
	"security_id" text NOT NULL,
	"delta_scaled" text NOT NULL,
	"cost_scaled" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "market_holdings_doc_user_sec_idx" ON "market_holdings" USING btree ("doc_id","user_id","security_id");