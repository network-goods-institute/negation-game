import { pointsTable } from "@/db/tables/pointsTable";
import { usersTable } from "@/db/tables/usersTable";
import { InferColumnsDataTypes } from "drizzle-orm";
import {
  date,
  doublePrecision,
  pgTable,
  primaryKey,
  index,
  integer,
  varchar,
} from "drizzle-orm/pg-core";

export const dailyStancesTable = pgTable(
  "daily_stances",
  {
    snapDay: date("snap_day", { mode: "date" }).notNull(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    pointId: integer("point_id")
      .notNull()
      .references(() => pointsTable.id, { onDelete: "cascade" }),
    zValue: doublePrecision("z_value").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.snapDay, table.userId, table.pointId] }),
    userIdx: index("daily_stances_user_idx").on(table.userId),
  })
);

export type DailyStance = InferColumnsDataTypes<
  typeof dailyStancesTable._.columns
>;
