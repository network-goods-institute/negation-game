import { spacesTable, usersTable } from "@/db/schema";
import { pointsTable } from "@/db/tables/pointsTable";
import { negationsTable } from "@/db/tables/negationsTable";
import { endorsementsTable } from "@/db/tables/endorsementsTable";
import { InferColumnsDataTypes, eq, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
  boolean,
  check,
} from "drizzle-orm/pg-core";

export const objectionsTable = pgTable(
  "objections",
  {
    id: serial("id").primaryKey(),
    objectionPointId: integer("objection_point_id")
      .references(() => pointsTable.id, { onDelete: "cascade" })
      .notNull(),
    targetPointId: integer("target_point_id")
      .references(() => pointsTable.id, { onDelete: "cascade" })
      .notNull(),
    contextPointId: integer("context_point_id")
      .references(() => pointsTable.id, { onDelete: "cascade" })
      .notNull(),
    parentEdgeId: integer("parent_edge_id")
      .references(() => negationsTable.id, { onDelete: "cascade" })
      .notNull(),
    endorsementId: integer("endorsement_id").references(
      () => endorsementsTable.id,
      { onDelete: "cascade" }
    ),
    createdBy: varchar("created_by", { length: 255 })
      .references(() => usersTable.id, { onDelete: "set null" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    space: varchar("space", { length: 100 })
      .references(() => spacesTable.id, { onDelete: "cascade" })
      .notNull(),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at"),
    deletedBy: varchar("deleted_by", { length: 255 }).references(
      () => usersTable.id,
      { onDelete: "set null" }
    ),
  },
  (table) => ({
    objectionPointIndex: index("objectionPointIndex").on(
      table.objectionPointId
    ),
    targetPointIndex: index("targetPointIndex").on(table.targetPointId),
    contextPointIndex: index("contextPointIndex").on(table.contextPointId),
    parentEdgeIndex: index("parentEdgeIndex").on(table.parentEdgeId),
    createdByIdx: index("objections_created_by_idx").on(table.createdBy),
    spaceIdx: index("objections_space_idx").on(table.space),
    activeIdx: index("objections_active_idx").on(
      table.isActive,
      table.deletedAt
    ),
    endorsementIdx: index("objections_endorsement_idx").on(table.endorsementId),
    uniqueObjectionConstraint: unique("uniqueObjection").on(
      table.objectionPointId,
      table.targetPointId,
      table.contextPointId,
      table.parentEdgeId
    ),
    softDeleteConsistency: check(
      "soft_delete_consistency",
      sql`(${table.isActive} = true AND ${table.deletedAt} IS NULL AND ${table.deletedBy} IS NULL) OR (${table.isActive} = false AND ${table.deletedAt} IS NOT NULL)`
    ),
  })
);

export type InsertObjection = Omit<
  typeof objectionsTable.$inferInsert,
  "id" | "createdAt" | "isActive" | "deletedAt" | "deletedBy"
>;
export type SelectObjection = typeof objectionsTable.$inferSelect;
export type Objection = InferColumnsDataTypes<typeof objectionsTable._.columns>;

export function softDeleteObjectionData(deletedBy: string): {
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

export function restoreObjectionData(): {
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

export const activeObjectionsFilter = eq(objectionsTable.isActive, true);
