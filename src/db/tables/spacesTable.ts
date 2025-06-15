import { InferColumnsDataTypes } from "drizzle-orm";
import {
  pgTable,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const spacesTable = pgTable(
  "spaces",
  {
    id: varchar("space_id", { length: 100 }).primaryKey(),
    icon: varchar("icon", { length: 255 }),
    // NOTE: pinnedPointId should reference pointsTable.id but this creates a circular import
    // don't fuck with it, we got it fixed in migrations via a foreign key constraint
    pinnedPointId: integer("pinned_point_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    pinnedPointIdx: index("spaces_pinned_point_idx").on(table.pinnedPointId),
  })
);

export type InsertSpace = Omit<
  typeof spacesTable.$inferInsert,
  "createdAt" | "updatedAt"
>;
export type SelectSpace = typeof spacesTable.$inferSelect;
export type Space = InferColumnsDataTypes<typeof spacesTable._.columns>;
