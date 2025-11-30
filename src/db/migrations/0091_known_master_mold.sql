CREATE INDEX "market_trades_doc_security_created_idx" ON "market_trades" USING btree ("doc_id","security_id","created_at");--> statement-breakpoint
CREATE INDEX "market_trades_doc_created_idx" ON "market_trades" USING btree ("doc_id","created_at");--> statement-breakpoint
CREATE INDEX "market_trades_user_idx" ON "market_trades" USING btree ("user_id");