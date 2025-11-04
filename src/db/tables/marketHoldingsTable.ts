import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

export const marketHoldingsTable = pgTable(
  "market_holdings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docId: text("doc_id").notNull(),
    userId: text("user_id").notNull(),
    securityId: text("security_id").notNull(),
    amountScaled: text("amount_scaled").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    docUserSecIdx: uniqueIndex("market_holdings_doc_user_sec_idx").on(
      t.docId,
      t.userId,
      t.securityId
    ),
  })
);

