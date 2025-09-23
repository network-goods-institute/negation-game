import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const mpDocsTable = pgTable("mp_docs", {
  id: text("id").primaryKey(), // roomName
  title: text("title"), // Board title (for board index)
  nodeTitle: text("node_title"), // Title node content (can be different after first save)
  ownerId: text("owner_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
