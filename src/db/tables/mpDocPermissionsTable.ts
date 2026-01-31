import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocShareLinksTable } from "@/db/tables/mpDocShareLinksTable";

export const mpDocPermissionsTable = pgTable(
  "mp_doc_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docId: text("doc_id")
      .notNull()
      .references(() => mpDocsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").$type<"owner" | "editor" | "viewer">().notNull(),
    grantedBy: text("granted_by"),
    /** If this permission was granted via a share link, the link ID is stored here.
     *  When the share link is revoked, permissions with this ID are also removed. */
    grantedByShareLinkId: uuid("granted_by_share_link_id").references(
      () => mpDocShareLinksTable.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    docIdx: index("mp_doc_permissions_doc_idx").on(table.docId),
    userIdx: index("mp_doc_permissions_user_idx").on(table.userId),
    shareLinkIdx: index("mp_doc_permissions_share_link_idx").on(table.grantedByShareLinkId),
    uniq: uniqueIndex("mp_doc_permissions_doc_user_uniq").on(table.docId, table.userId),
  })
);
