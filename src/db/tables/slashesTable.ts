import { pointsTable } from "@/db/tables/pointsTable";
import { usersTable } from "@/db/tables/usersTable";
import { restakesTable } from "@/db/tables/restakesTable";
import { spacesTable } from "@/db/tables/spacesTable";
import { InferColumnsDataTypes, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
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
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id, {
        onDelete: "set null",
      })
      .notNull(),
    restakeId: integer("restake_id")
      .references(() => restakesTable.id, {
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
    space: varchar("space", { length: 100 })
      .notNull()
      .references(() => spacesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Ensure amount is non-negative
    amountNonNegativeConstraint: check(
      "amount_non_negative_constraint",
      sql`${table.amount} >= 0`
    ),
    // Unique constraint for slashes
    uniqueSlash: unique("unique_slash").on(table.userId, table.restakeId),
    // Indexes
    userIndex: index("slashes_user_idx").on(table.userId),
    restakeIndex: index("slashes_restake_idx").on(table.restakeId),
    pointIndex: index("slashes_point_idx").on(table.pointId),
    negationIndex: index("slashes_negation_idx").on(table.negationId),
    spaceIdx: index("slashes_space_idx").on(table.space),
    // Performance indexes for epistemics calculations
    restakeAmountIdx: index("slashes_restake_amount_idx").on(
      table.restakeId,
      table.amount
    ),
    userSpaceIdx: index("slashes_user_space_idx").on(table.userId, table.space),
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
export type InsertSlash = Omit<
  typeof slashesTable.$inferInsert,
  "id" | "createdAt"
>;
export type SelectSlash = typeof slashesTable.$inferSelect;
export type Slash = InferColumnsDataTypes<typeof slashesTable._.columns>;

export type InsertSlashHistory = Omit<
  typeof slashHistoryTable.$inferInsert,
  "id" | "createdAt"
>;
export type SelectSlashHistory = typeof slashHistoryTable.$inferSelect;
export type SlashHistory = InferColumnsDataTypes<
  typeof slashHistoryTable._.columns
>;
