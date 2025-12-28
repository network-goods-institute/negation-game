import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocShareLinksTable } from "@/db/tables/mpDocShareLinksTable";

export const mpDocAccessTable = pgTable(
  "mp_doc_access",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docId: text("doc_id").notNull().references(() => mpDocsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    shareLinkId: uuid("share_link_id").references(() => mpDocShareLinksTable.id, { onDelete: "set null" }),
    lastOpenAt: timestamp("last_open_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("mp_doc_access_user_idx").on(t.userId),
    docIdx: index("mp_doc_access_doc_idx").on(t.docId),
    shareLinkIdx: index("mp_doc_access_share_link_idx").on(t.shareLinkId),
    uniq: uniqueIndex("mp_doc_access_user_doc_uniq").on(t.userId, t.docId),
  })
);
