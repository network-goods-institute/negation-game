import { viewpointsTable } from "@/db/schema";
import { InferColumnsDataTypes } from "drizzle-orm";
import {
  pgTable,
  varchar,
  integer,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const viewpointInteractionsTable = pgTable(
  "viewpoint_interactions",
  {
    viewpointId: varchar("viewpoint_id")
      .references(() => viewpointsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    // Use integer for views and copies to efficiently count interactions
    views: integer("views").notNull().default(0),
    copies: integer("copies").notNull().default(0),
    lastViewed: timestamp("last_viewed").notNull().defaultNow(),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    // Make viewpointId the primary key since we'll have one interaction record per viewpoint
    viewpointIdIndex: primaryKey(table.viewpointId),
  })
);

export type ViewpointInteraction = InferColumnsDataTypes<
  typeof viewpointInteractionsTable._.columns
>;
export type InsertViewpointInteraction =
  typeof viewpointInteractionsTable.$inferInsert;
export type SelectViewpointInteraction =
  typeof viewpointInteractionsTable.$inferSelect;

export const insertViewpointInteractionSchema = createInsertSchema(
  viewpointInteractionsTable
);
