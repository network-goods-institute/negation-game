import { ViewpointGraph } from "@/app/s/[space]/viewpoint/viewpointAtoms";
import { DEFAULT_SPACE } from "@/constants/config";
import { spacesTable } from "@/db/schema";
import { InferColumnsDataTypes } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const viewpointsTable = pgTable("viewpoints", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  description: text("content").notNull(),
  graph: jsonb("graph").$type<ViewpointGraph>().notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  space: varchar("space")
    .references(() => spacesTable.id, {
      onDelete: "cascade",
    })
    .default(DEFAULT_SPACE),
});

export type InsertViewpoint = Omit<
  typeof viewpointsTable.$inferInsert,
  "createdAt"
>;
export type SelectViewpoint = typeof viewpointsTable.$inferSelect;
export type Viewpoint = InferColumnsDataTypes<typeof viewpointsTable._.columns>;

export const insertViewpointSchema = createInsertSchema(viewpointsTable);
