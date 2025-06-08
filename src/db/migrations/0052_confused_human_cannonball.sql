ALTER TABLE "definitions" ALTER COLUMN "space" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "embeddings" ALTER COLUMN "space" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "endorsements" ALTER COLUMN "space" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "negations" ALTER COLUMN "space" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "points" ALTER COLUMN "space" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "space" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "viewpoints" ALTER COLUMN "space" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "negations" ADD COLUMN "is_objection" boolean DEFAULT false NOT NULL;