import { InferColumnsDataTypes } from "drizzle-orm";
import { pgTable, varchar } from "drizzle-orm/pg-core";

export const spacesTable = pgTable("spaces", {
  id: varchar("space_id").primaryKey(),
  icon: varchar("icon"),
});

export type InsertSpace = typeof spacesTable.$inferInsert;
export type SelectSpace = typeof spacesTable.$inferSelect;
export type Space = InferColumnsDataTypes<typeof spacesTable._.columns>;
