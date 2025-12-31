import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { mpDocsTable } from "@/db/tables/mpDocsTable";

export const mpDocAccessRequestsTable = pgTable(
  "mp_doc_access_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docId: text("doc_id")
      .notNull()
      .references(() => mpDocsTable.id, { onDelete: "cascade" }),
    requesterId: text("requester_id").notNull(),
    requestedRole: text("requested_role").$type<"viewer" | "editor">().notNull(),
    status: text("status").$type<"pending" | "approved" | "declined">().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"),
    resolvedRole: text("resolved_role").$type<"viewer" | "editor">(),
  },
  (table) => ({
    docIdx: index("mp_doc_access_requests_doc_idx").on(table.docId),
    requesterIdx: index("mp_doc_access_requests_requester_idx").on(table.requesterId),
    statusIdx: index("mp_doc_access_requests_status_idx").on(table.status),
    uniq: uniqueIndex("mp_doc_access_requests_doc_requester_uniq").on(table.docId, table.requesterId),
  })
);
