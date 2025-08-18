import {
  integer,
  pgTable,
  primaryKey,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { experimentalGraphDocsTable } from "@/db/tables/experimentalGraphDocsTable";
import { pointsTable } from "@/db/tables/pointsTable";

export const experimentalGraphDocPointsTable = pgTable(
  "experimental_graph_doc_points",
  {
    docId: varchar("doc_id", { length: 255 })
      .notNull()
      .references(() => experimentalGraphDocsTable.id, { onDelete: "cascade" }),
    pointId: integer("point_id")
      .notNull()
      .references(() => pointsTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.docId, table.pointId] }),
    docIdx: index("exp_doc_points_doc_idx").on(table.docId),
    pointIdx: index("exp_doc_points_point_idx").on(table.pointId),
  })
);
