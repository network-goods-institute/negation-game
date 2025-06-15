import { pointsTable } from "@/db/tables/pointsTable";
import { usersTable } from "@/db/tables/usersTable";
import { spacesTable } from "@/db/tables/spacesTable";
import { InferColumnsDataTypes, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const doubtActionEnum = pgEnum("doubt_action", [
  "created",
  "increased",
  "deactivated",
  "reduced_by_slash",
]);

export const doubtsTable = pgTable(
  "doubts",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id, {
        onDelete: "set null",
      })
      .notNull(),
    pointId: integer("point_id")
      .references(() => pointsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    negationId: integer("negation_id")
      .references(() => pointsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    amount: integer("amount").notNull(),
    space: varchar("space", { length: 100 })
      .notNull()
      .references(() => spacesTable.id, { onDelete: "cascade" }),
    lastEarningsAt: timestamp("last_earnings_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    amountNonNegativeConstraint: check(
      "amount_non_negative_constraint",
      sql`${table.amount} >= 0`
    ),
    uniqueDoubt: unique("unique_doubt").on(
      table.userId,
      table.pointId,
      table.negationId
    ),
    userIndex: index("doubts_user_idx").on(table.userId),
    pointIndex: index("doubts_point_idx").on(table.pointId),
    negationIndex: index("doubts_negation_idx").on(table.negationId),
    spaceIdx: index("doubts_space_idx").on(table.space),
  })
);

export const doubtHistoryTable = pgTable(
  "doubt_history",
  {
    id: serial("id").primaryKey(),
    doubtId: integer("doubt_id")
      .references(() => doubtsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id, {
        onDelete: "set null",
      })
      .notNull(),
    pointId: integer("point_id")
      .references(() => pointsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    negationId: integer("negation_id")
      .references(() => pointsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    action: doubtActionEnum("action").notNull(),
    previousAmount: integer("previous_amount"),
    newAmount: integer("new_amount").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    doubtIndex: index("doubt_history_doubt_idx").on(table.doubtId),
    userIndex: index("doubt_history_user_idx").on(table.userId),
    pointIndex: index("doubt_history_point_idx").on(table.pointId),
    negationIndex: index("doubt_history_negation_idx").on(table.negationId),
  })
);

// Export types
export type InsertDoubt = Omit<
  typeof doubtsTable.$inferInsert,
  "id" | "createdAt" | "lastEarningsAt"
>;
export type SelectDoubt = typeof doubtsTable.$inferSelect;
export type Doubt = InferColumnsDataTypes<typeof doubtsTable._.columns>;

export type InsertDoubtHistory = Omit<
  typeof doubtHistoryTable.$inferInsert,
  "id" | "createdAt"
>;
export type SelectDoubtHistory = typeof doubtHistoryTable.$inferSelect;
export type DoubtHistory = InferColumnsDataTypes<
  typeof doubtHistoryTable._.columns
>;
