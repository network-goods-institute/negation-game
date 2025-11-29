CREATE INDEX "market_holdings_doc_idx" ON "market_holdings" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "market_holdings_user_idx" ON "market_holdings" USING btree ("user_id");