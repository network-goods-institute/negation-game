import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { spacesTable, topicsTable, usersTable } from "@/db/schema";
import { InferColumnsDataTypes, sql, eq } from "drizzle-orm";
import {
  jsonb,
  pgTable,
  varchar,
  timestamp,
  integer,
  boolean,
  check,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const viewpointsTable = pgTable(
  "viewpoints",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: varchar("content", { length: 2000 }).notNull().default(""),
    graph: jsonb("graph").$type<ViewpointGraph>().notNull(),
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
    viewsAtLastUpdate: integer("views_at_last_update").notNull().default(0),
    space: varchar("space", { length: 100 }).references(() => spacesTable.id, {
      onDelete: "cascade",
    }),
    copiedFromId: varchar("copied_from_id", { length: 255 }),
    topicId: integer("topic_id").references(() => topicsTable.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at"),
    deletedBy: varchar("deleted_by", { length: 255 }).references(
      () => usersTable.id,
      { onDelete: "set null" }
    ),
  },
  (table) => ({
    titleLengthCheck: check(
      "title_length_check",
      sql`LENGTH(${table.title}) >= 1 AND LENGTH(${table.title}) <= 200`
    ),
    descriptionLengthCheck: check(
      "description_length_check",
      sql`LENGTH(${table.description}) <= 2000`
    ),
    softDeleteConsistency: check(
      "soft_delete_consistency",
      sql`(${table.isActive} = true AND ${table.deletedAt} IS NULL AND ${table.deletedBy} IS NULL) OR (${table.isActive} = false AND ${table.deletedAt} IS NOT NULL)`
    ),
    createdByIdx: index("viewpoints_created_by_idx").on(table.createdBy),
    spaceIdx: index("viewpoints_space_idx").on(table.space),
    activeIdx: index("viewpoints_active_idx").on(
      table.isActive,
      table.deletedAt
    ),
    topicIdx: index("viewpoints_topic_idx").on(table.topicId),
  })
);

export type InsertViewpoint = Omit<
  typeof viewpointsTable.$inferInsert,
  | "createdAt"
  | "lastUpdatedAt"
  | "viewsAtLastUpdate"
  | "isActive"
  | "deletedAt"
  | "deletedBy"
>;
export type SelectViewpoint = typeof viewpointsTable.$inferSelect;
export type Viewpoint = InferColumnsDataTypes<typeof viewpointsTable._.columns>;

export function createViewpointData(viewpointData: {
  id: string;
  title: string;
  description?: string;
  graph: ViewpointGraph;
  createdBy: string;
  space?: string;
  copiedFromId?: string;
  topicId?: number;
}): InsertViewpoint {
  return {
    id: viewpointData.id,
    title: viewpointData.title,
    description: viewpointData.description ?? "",
    graph: viewpointData.graph,
    createdBy: viewpointData.createdBy,
    space: viewpointData.space ?? null,
    copiedFromId: viewpointData.copiedFromId ?? null,
    topicId: viewpointData.topicId ?? null,
  };
}

export function softDeleteViewpointData(deletedBy: string): {
  isActive: false;
  deletedAt: Date;
  deletedBy: string;
} {
  return {
    isActive: false,
    deletedAt: new Date(),
    deletedBy,
  };
}

export function restoreViewpointData(): {
  isActive: true;
  deletedAt: null;
  deletedBy: null;
} {
  return {
    isActive: true,
    deletedAt: null,
    deletedBy: null,
  };
}

export const activeViewpointsFilter = eq(viewpointsTable.isActive, true);
