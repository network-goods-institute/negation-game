ALTER TABLE "spaces" ADD COLUMN "allow_public_topic_creation" boolean DEFAULT false NOT NULL;
-- Enable public topic creation for scroll and scroll_test spaces
UPDATE spaces 
SET allow_public_topic_creation = true 
WHERE space_id IN ('scroll', 'scroll_test');