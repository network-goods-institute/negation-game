import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

export const marketTradesTable = pgTable(
  "market_trades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docId: text("doc_id").notNull(),
    userId: text("user_id").notNull(),
    securityId: text("security_id").notNull(),
    deltaScaled: text("delta_scaled").notNull(),
    costScaled: text("cost_scaled").notNull(),
    priceAfterScaled: text("price_after_scaled"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("market_trades_doc_security_created_idx").on(
      table.docId,
      table.securityId,
      table.createdAt
    ),
    index("market_trades_doc_created_idx").on(table.docId, table.createdAt),
    index("market_trades_user_idx").on(table.userId),
  ]
);
