import { pgTable, text, timestamp, bigint } from "drizzle-orm/pg-core";

export const marketStateTable = pgTable("market_state", {
  docId: text("doc_id").primaryKey(),
  version: bigint("version", { mode: "number" }).default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

