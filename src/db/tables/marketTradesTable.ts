import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const marketTradesTable = pgTable("market_trades", {
  id: uuid("id").defaultRandom().primaryKey(),
  docId: text("doc_id").notNull(),
  userId: text("user_id").notNull(),
  securityId: text("security_id").notNull(),
  deltaScaled: text("delta_scaled").notNull(),
  costScaled: text("cost_scaled").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

