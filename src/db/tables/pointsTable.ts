import { spacesTable, usersTable } from "@/db/schema";
import { InferColumnsDataTypes, sql, eq, and } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  boolean,
  index,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const pointsTable = pgTable(
  "points",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    keywords: text("keywords")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    space: varchar("space", { length: 100 })
      .notNull()
      .references(() => spacesTable.id, { onDelete: "cascade" }),
    isCommand: boolean("is_command").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at"),
    deletedBy: varchar("deleted_by", { length: 255 }).references(
      () => usersTable.id,
      { onDelete: "set null" }
    ),
  },
  (table) => ({
    createdByIdx: index("points_created_by_idx").on(table.createdBy),
    spaceIdx: index("points_space_idx").on(table.space),
    activeIdx: index("points_active_idx").on(table.isActive, table.deletedAt),
    createdAtIdx: index("points_created_at_idx").on(table.createdAt),
    // Performance indexes for priority points queries
    spaceActiveCreatedIdx: index("points_space_active_created_idx").on(
      table.space,
      table.isActive,
      table.createdAt
    ),
    spaceActiveIdx: index("points_space_active_idx").on(
      table.space,
      table.isActive
    ),
    contentLengthCheck: check(
      "content_length_check",
      sql`LENGTH(${table.content}) >= 1 AND LENGTH(${table.content}) <= 10000`
    ),
    softDeleteConsistency: check(
      "soft_delete_consistency",
      sql`(${table.isActive} = true AND ${table.deletedAt} IS NULL AND ${table.deletedBy} IS NULL) OR (${table.isActive} = false AND ${table.deletedAt} IS NOT NULL)`
    ),
  })
);

export type InsertPoint = Omit<
  typeof pointsTable.$inferInsert,
  "id" | "createdAt" | "isActive" | "deletedAt" | "deletedBy"
>;
export type SelectPoint = typeof pointsTable.$inferSelect;
export type Point = InferColumnsDataTypes<typeof pointsTable._.columns>;

export const insertPointSchema = createInsertSchema(pointsTable);

export function softDeletePointData(deletedBy: string): {
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

export function restorePointData(): {
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

export const activePointsFilter = eq(pointsTable.isActive, true);
