import { pointsTable } from "@/db/tables/pointsTable";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { InferColumnsDataTypes } from "drizzle-orm";
import {
  integer,
  pgTable,
  varchar,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const rationalePointsTable = pgTable(
  "rationale_points",
  {
    rationaleId: varchar("rationale_id", { length: 255 })
      .notNull()
      .references(() => viewpointsTable.id, { onDelete: "cascade" }),
    pointId: integer("point_id")
      .notNull()
      .references(() => pointsTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.rationaleId, table.pointId] }),
    rationaleIdx: index("rationale_points_rationale_idx").on(table.rationaleId),
    pointIdx: index("rationale_points_point_idx").on(table.pointId),
  })
);

export type RationalePoint = InferColumnsDataTypes<typeof rationalePointsTable._.columns>;