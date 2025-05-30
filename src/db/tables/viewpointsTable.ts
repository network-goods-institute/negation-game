import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { spacesTable, topicsTable } from "@/db/schema";
import { InferColumnsDataTypes } from "drizzle-orm";
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const viewpointsTable = pgTable("viewpoints", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  description: text("content").notNull().default(""),
  graph: jsonb("graph").$type<ViewpointGraph>().notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
  viewsAtLastUpdate: integer("views_at_last_update").notNull().default(0),
  space: varchar("space").references(() => spacesTable.id, {
    onDelete: "cascade",
  }),
  copiedFromId: varchar("copied_from_id").references(
    (): any => viewpointsTable.id,
    { onDelete: "set null" }
  ),
  topicId: integer("topic_id").references(() => topicsTable.id, {
    onDelete: "set null",
  }),
});

export type InsertViewpoint = Omit<
  typeof viewpointsTable.$inferInsert,
  "createdAt" | "lastUpdatedAt" | "viewsAtLastUpdate"
>;
export type SelectViewpoint = typeof viewpointsTable.$inferSelect;
export type Viewpoint = InferColumnsDataTypes<typeof viewpointsTable._.columns>;

export const insertViewpointSchema = createInsertSchema(viewpointsTable);
