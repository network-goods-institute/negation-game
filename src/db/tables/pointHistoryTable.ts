import { pointsTable } from "@/db/tables/pointsTable";
import { usersTable } from "@/db/tables/usersTable";
import { InferColumnsDataTypes } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const pointActionEnum = pgEnum("point_action", [
  "created",
  "edited",
  "deleted",
  "restored",
]);

export const pointHistoryTable = pgTable(
  "point_history",
  {
    id: serial("id").primaryKey(),
    pointId: integer("point_id")
      .references(() => pointsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id, {
        onDelete: "set null",
      })
      .notNull(),
    action: pointActionEnum("action").notNull(),
    previousContent: text("previous_content"),
    newContent: text("new_content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    pointIndex: index("point_history_point_idx").on(table.pointId),
    userIndex: index("point_history_user_idx").on(table.userId),
    actionIndex: index("point_history_action_idx").on(table.action),
    createdAtIndex: index("point_history_created_at_idx").on(table.createdAt),
    pointCreatedAtIndex: index("point_history_point_created_at_idx").on(
      table.pointId,
      table.createdAt
    ),
  })
);

export type InsertPointHistory = Omit<
  typeof pointHistoryTable.$inferInsert,
  "id" | "createdAt"
>;
export type SelectPointHistory = typeof pointHistoryTable.$inferSelect;
export type PointHistory = InferColumnsDataTypes<
  typeof pointHistoryTable._.columns
>;
