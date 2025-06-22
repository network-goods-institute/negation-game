import { pointsTable } from "@/db/tables/pointsTable";
import { usersTable } from "@/db/tables/usersTable";
import { InferColumnsDataTypes } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const credEventKindEnum = pgEnum("cred_event_kind", [
  "ENDORSE",
  "RESTAKE",
  "SLASH",
  "DOUBT",
]);

export const credEventsTable = pgTable(
  "cred_events",
  {
    eventId: serial("event_id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    pointId: integer("point_id")
      .notNull()
      .references(() => pointsTable.id, { onDelete: "cascade" }),
    kind: credEventKindEnum("kind").notNull(),
    amount: integer("amount").notNull(),
    ts: timestamp("ts", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("cred_events_user_idx").on(table.userId),
    pointIdx: index("cred_events_point_idx").on(table.pointId),
    tsIdx: index("cred_events_ts_idx").on(table.ts),
    kindIdx: index("cred_events_kind_idx").on(table.kind),
  })
);

export type CredEvent = InferColumnsDataTypes<typeof credEventsTable._.columns>;
