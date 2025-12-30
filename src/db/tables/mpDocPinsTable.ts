import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { mpDocsTable } from "@/db/tables/mpDocsTable";

export const mpDocPinsTable = pgTable(
  "mp_doc_pins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docId: text("doc_id")
      .notNull()
      .references(() => mpDocsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    docIdx: index("mp_doc_pins_doc_idx").on(table.docId),
    userIdx: index("mp_doc_pins_user_idx").on(table.userId),
    uniq: uniqueIndex("mp_doc_pins_user_doc_uniq").on(table.userId, table.docId),
  })
);
