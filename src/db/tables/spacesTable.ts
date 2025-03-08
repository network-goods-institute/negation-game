import { InferColumnsDataTypes } from "drizzle-orm";
import { pgTable, varchar, integer } from "drizzle-orm/pg-core";

export const spacesTable = pgTable("spaces", {
  id: varchar("space_id").primaryKey(),
  icon: varchar("icon"),
  pinnedPointId: integer("pinned_point_id"),
});

export type InsertSpace = typeof spacesTable.$inferInsert;
export type SelectSpace = typeof spacesTable.$inferSelect;
export type Space = InferColumnsDataTypes<typeof spacesTable._.columns>;
