import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { mpDocsTable } from "@/db/tables/mpDocsTable";

export const mpMindchangeTable = pgTable(
  "mp_mindchange",
  {
    id: serial("id").primaryKey(),
    docId: text("doc_id")
      .notNull()
      .references(() => mpDocsTable.id, { onDelete: "cascade" }),
    edgeId: text("edge_id").notNull(),
    userId: text("user_id").notNull(),
    forwardValue: integer("forward_value").notNull(), // validated in actions 0-100
    backwardValue: integer("backward_value").notNull(), // validated in actions 0-100
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    docEdgeIdx: index("mp_mindchange_doc_edge_idx").on(
      table.docId,
      table.edgeId
    ),
    uniqueByUser: uniqueIndex("mp_mindchange_doc_edge_user_uidx").on(
      table.docId,
      table.edgeId,
      table.userId
    ),
  })
);
