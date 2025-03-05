import { relations } from "drizzle-orm";
import { spacesTable, pointsTable } from "@/db/schema";

export const spacesRelations = relations(spacesTable, ({ one }) => ({
  pinnedPoint: one(pointsTable, {
    fields: [spacesTable.pinnedPointId],
    references: [pointsTable.id],
  }),
}));

export const pointsRelations = relations(pointsTable, ({ one }) => ({
  space: one(spacesTable, {
    fields: [pointsTable.space],
    references: [spacesTable.id],
  }),
}));
