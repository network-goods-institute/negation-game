import { pointsTable } from "@/db/tables/pointsTable";
import { usersTable } from "@/db/tables/usersTable";
import { topicsTable } from "@/db/tables/topicsTable";
import { InferColumnsDataTypes } from "drizzle-orm";
import {
  date,
  integer,
  pgTable,
  smallint,
  primaryKey,
  index,
  varchar,
} from "drizzle-orm/pg-core";

export const snapshotsTable = pgTable(
  "snapshots",
  {
    snapDay: date("snap_day", { mode: "date" }).notNull(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    pointId: integer("point_id")
      .notNull()
      .references(() => pointsTable.id, { onDelete: "cascade" }),
    endorse: integer("endorse").notNull().default(0),
    restakeLive: integer("restake_live").notNull().default(0),
    doubt: integer("doubt").notNull().default(0),
    sign: smallint("sign").notNull(),
    bucketId: integer("bucket_id").references(() => topicsTable.id, { onDelete: "set null" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.snapDay, table.userId, table.pointId] }),
    pointDayIdx: index("snapshots_point_day_idx").on(
      table.pointId,
      table.snapDay
    ),
    userIdx: index("snapshots_user_idx").on(table.userId),
  })
);

export type Snapshot = InferColumnsDataTypes<typeof snapshotsTable._.columns>;
