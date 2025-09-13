import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { mpDocsTable } from "@/db/tables/mpDocsTable";

export const mpDocAccessTable = pgTable(
  "mp_doc_access",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docId: text("doc_id").notNull().references(() => mpDocsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    lastOpenAt: timestamp("last_open_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("mp_doc_access_user_idx").on(t.userId),
    docIdx: index("mp_doc_access_doc_idx").on(t.docId),
    uniq: uniqueIndex("mp_doc_access_user_doc_uniq").on(t.userId, t.docId),
  })
);

