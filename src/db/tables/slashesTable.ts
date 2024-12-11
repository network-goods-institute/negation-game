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

export const slashActionEnum = pgEnum("slash_action", [
  "created",
  "increased",
  "decreased",
  "deactivated",
]);

export const slashesTable = pgTable(
  "slashes",
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
    active: boolean("active").notNull().default(true),
  },
  (table) => ({
    // Ensure amount is positive
    amountPositiveConstraint: check(
      "amount_positive_constraint",
      sql`${table.amount} > 0`
    ),
    uniqueActiveSlash: unique("unique_active_slash").on(table.userId, table.pointId, table.negationId),

    userIndex: index("slashes_user_idx").on(table.userId),
    pointIndex: index("slashes_point_idx").on(table.pointId),
    negationIndex: index("slashes_negation_idx").on(table.negationId),
  })
);

export const slashHistoryTable = pgTable(
  "slash_history",
  {
    id: serial("id").primaryKey(),
    slashId: integer("slash_id")
      .references(() => slashesTable.id, {
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
    action: slashActionEnum("action").notNull(),
    previousAmount: integer("previous_amount"),
    newAmount: integer("new_amount").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Indexes for faster querying
    slashIndex: index("slash_history_slash_idx").on(table.slashId),
    userIndex: index("slash_history_user_idx").on(table.userId),
    pointIndex: index("slash_history_point_idx").on(table.pointId),
    negationIndex: index("slash_history_negation_idx").on(table.negationId),
  })
);

// Export types
export type InsertSlash = typeof slashesTable.$inferInsert;
export type SelectSlash = typeof slashesTable.$inferSelect;
export type Slash = InferColumnsDataTypes<typeof slashesTable._.columns>;

export type InsertSlashHistory = typeof slashHistoryTable.$inferInsert;
export type SelectSlashHistory = typeof slashHistoryTable.$inferSelect;
export type SlashHistory = InferColumnsDataTypes<
  typeof slashHistoryTable._.columns
>; 