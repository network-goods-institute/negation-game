import { pgTable, uuid, text, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { mpDocsTable } from "@/db/tables/mpDocsTable";

export const mpDocShareLinksTable = pgTable(
  "mp_doc_share_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docId: text("doc_id")
      .notNull()
      .references(() => mpDocsTable.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    role: text("role").$type<"editor" | "viewer">().notNull(),
    requireLogin: boolean("require_login").notNull().default(true),
    grantPermanentAccess: boolean("grant_permanent_access").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    docIdx: index("mp_doc_share_links_doc_idx").on(table.docId),
    tokenIdx: index("mp_doc_share_links_token_idx").on(table.token),
    tokenUniq: uniqueIndex("mp_doc_share_links_token_uniq").on(table.token),
  })
);
