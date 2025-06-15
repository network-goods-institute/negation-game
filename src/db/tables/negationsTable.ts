import { InferColumnsDataTypes, lt, eq, sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  timestamp,
  unique,
  varchar,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { and } from "drizzle-orm";

export const negationsTable = pgTable(
  "negations",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    olderPointId: integer("older_point_id").notNull(),
    newerPointId: integer("newer_point_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    space: varchar("space", { length: 100 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    deletedAt: timestamp("deleted_at"),
    deletedBy: varchar("deleted_by", { length: 255 }),
  },
  (table) => ({
    olderPointFirstConstraint: check(
      "olderPointFirst",
      lt(table.olderPointId, table.newerPointId)
    ),
    softDeleteConsistency: check(
      "soft_delete_consistency",
      sql`(${table.isActive} = true AND ${table.deletedAt} IS NULL AND ${table.deletedBy} IS NULL) OR (${table.isActive} = false AND ${table.deletedAt} IS NOT NULL)`
    ),
    olderPointIndex: index("olderPointIndex").on(table.olderPointId),
    newerPointIndex: index("newerPointIndex").on(table.newerPointId),
    createdByIdx: index("negations_created_by_idx").on(table.createdBy),
    spaceIdx: index("negations_space_idx").on(table.space),
    activeIdx: index("negations_active_idx").on(
      table.isActive,
      table.deletedAt
    ),
    activeOlderIdx: index("negations_active_older_idx")
      .on(table.olderPointId, table.isActive)
      .where(eq(table.isActive, true)),
    activeNewerIdx: index("negations_active_newer_idx")
      .on(table.newerPointId, table.isActive)
      .where(eq(table.isActive, true)),
    activeBothIdx: index("negations_active_both_idx")
      .on(table.olderPointId, table.newerPointId, table.isActive)
      .where(eq(table.isActive, true)),
    uniqueNegationsConstraint: unique("uniqueNegation").on(
      table.olderPointId,
      table.newerPointId
    ),
  })
);

export const insertNegationSchema = createInsertSchema(negationsTable);

export type InsertNegation = z.infer<typeof insertNegationSchema>;
export type SelectNegation = typeof negationsTable.$inferSelect;
export type Negation = InferColumnsDataTypes<typeof negationsTable._.columns>;

export function softDeleteNegationData(deletedBy: string): {
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

export function restoreNegationData(): {
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

export const activeNegationsFilter = and(eq(negationsTable.isActive, true));
