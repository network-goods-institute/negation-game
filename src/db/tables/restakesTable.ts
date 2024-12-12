import { pointsTable } from "@/db/tables/pointsTable";
import { usersTable } from "@/db/tables/usersTable";
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

// Create enum for restake history actions
export const restakeActionEnum = pgEnum("restake_action", [
  "created",
  "increased",
  "decreased",
  "deactivated",
]);

export const restakesTable = pgTable(
  "restakes",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .references(() => usersTable.id, {
        onDelete: "cascade",
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Ensure amount is non-negative
    amountNonNegativeConstraint: check(
      "amount_non_negative_constraint",
      sql`${table.amount} >= 0`
    ),
    // Unique constraint for restakes - this is needed for the foreign key reference
    uniqueRestake: unique("unique_restake").on(table.userId, table.pointId, table.negationId),
    // Indexes
    userIndex: index("restakes_user_idx").on(table.userId),
    pointIndex: index("restakes_point_idx").on(table.pointId),
    negationIndex: index("restakes_negation_idx").on(table.negationId),
  })
);

export const restakeHistoryTable = pgTable(
  "restake_history",
  {
    id: serial("id").primaryKey(),
    restakeId: integer("restake_id")
      .references(() => restakesTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    userId: varchar("user_id")
      .references(() => usersTable.id, {
        onDelete: "cascade",
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
    action: restakeActionEnum("action").notNull(),
    previousAmount: integer("previous_amount"),
    newAmount: integer("new_amount").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Indexes for faster querying
    restakeIndex: index("restake_history_restake_idx").on(table.restakeId),
    userIndex: index("restake_history_user_idx").on(table.userId),
    pointIndex: index("restake_history_point_idx").on(table.pointId),
    negationIndex: index("restake_history_negation_idx").on(table.negationId),
  })
);

// Export types
export type InsertRestake = typeof restakesTable.$inferInsert;
export type SelectRestake = typeof restakesTable.$inferSelect;
export type Restake = InferColumnsDataTypes<typeof restakesTable._.columns>;

export type InsertRestakeHistory = typeof restakeHistoryTable.$inferInsert;
export type SelectRestakeHistory = typeof restakeHistoryTable.$inferSelect;
export type RestakeHistory = InferColumnsDataTypes<
  typeof restakeHistoryTable._.columns
>;