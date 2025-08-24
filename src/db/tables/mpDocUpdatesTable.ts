import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const mpDocUpdatesTable = pgTable("mp_doc_updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  docId: text("doc_id")
    .notNull()
    .references(() => mpDocsTable.id, { onDelete: "cascade" }),
  // Base64-encoded Yjs update
  update: text("update").notNull(),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
