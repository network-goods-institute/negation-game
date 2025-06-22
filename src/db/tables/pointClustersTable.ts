import { pointsTable } from "@/db/tables/pointsTable";
import { InferColumnsDataTypes, sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  smallint,
  index,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";

export const pointClustersTable = pgTable(
  "point_clusters",
  {
    rootId: integer("root_id")
      .notNull()
      .references(() => pointsTable.id, { onDelete: "cascade" }),
    pointId: integer("point_id")
      .notNull()
      .references(() => pointsTable.id, { onDelete: "cascade" }),
    depth: integer("depth").notNull(),
    sign: smallint("sign").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      name: "point_clusters_pk",
      columns: [table.rootId, table.pointId],
    }),
    rootIdx: index("point_clusters_root_idx").on(table.rootId),
    depthIdx: index("point_clusters_depth_idx").on(table.depth),
    signCheck: check("sign_is_valid", sql`${table.sign} IN (-1, 1)`),
  })
);

export type PointCluster = InferColumnsDataTypes<
  typeof pointClustersTable._.columns
>;
