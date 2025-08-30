import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const mpDocsTable = pgTable("mp_docs", {
  id: text("id").primaryKey(), // roomName
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
