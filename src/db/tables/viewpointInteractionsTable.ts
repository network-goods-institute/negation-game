import { viewpointsTable } from "@/db/schema";
import { InferColumnsDataTypes, sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  integer,
  timestamp,
  primaryKey,
  index,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const viewpointInteractionsTable = pgTable(
  "viewpoint_interactions",
  {
    viewpointId: varchar("viewpoint_id", { length: 255 })
      .references(() => viewpointsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    views: integer("views").notNull().default(0),
    copies: integer("copies").notNull().default(0),
    version: integer("version").notNull().default(1),
    lastViewed: timestamp("last_viewed").notNull().defaultNow(),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => ({
    viewpointIdPk: primaryKey({ columns: [table.viewpointId] }),
    positiveViews: check("positive_views", sql`${table.views} >= 0`),
    positiveCopies: check("positive_copies", sql`${table.copies} >= 0`),
    positiveVersion: check("positive_version", sql`${table.version} >= 1`),
    lastViewedIdx: index("viewpoint_interactions_last_viewed_idx").on(
      table.lastViewed
    ),
    lastUpdatedIdx: index("viewpoint_interactions_last_updated_idx").on(
      table.lastUpdated
    ),
    viewsIdx: index("viewpoint_interactions_views_idx").on(table.views),
    copiesIdx: index("viewpoint_interactions_copies_idx").on(table.copies),
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

export function createViewpointInteractionData(
  viewpointId: string
): InsertViewpointInteraction {
  return {
    viewpointId,
    views: 0,
    copies: 0,
    version: 1,
  };
}

export function incrementViewsData() {
  return {
    views: sql`${viewpointInteractionsTable.views} + 1`,
    version: sql`${viewpointInteractionsTable.version} + 1`,
    lastViewed: new Date(),
  };
}

export function incrementCopiesData() {
  return {
    copies: sql`${viewpointInteractionsTable.copies} + 1`,
    version: sql`${viewpointInteractionsTable.version} + 1`,
    lastUpdated: new Date(),
  };
}

export function incrementBulkData(views: number = 0, copies: number = 0) {
  const updates: any = {
    version: sql`${viewpointInteractionsTable.version} + 1`,
    lastUpdated: new Date(),
  };

  if (views > 0) {
    updates.views = sql`${viewpointInteractionsTable.views} + ${views}`;
    updates.lastViewed = new Date();
  }

  if (copies > 0) {
    updates.copies = sql`${viewpointInteractionsTable.copies} + ${copies}`;
  }

  return updates;
}
