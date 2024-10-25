import { pointsTable } from "@/db/tables/pointsTable";
import { usersTable } from "@/db/tables/usersTable";
import { InferColumnsDataTypes } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const endorsementsTable = pgTable(
  "endorsements",
  {
    id: serial("id").primaryKey(),
    cred: integer("cred").notNull(),
    pointId: integer("point_id")
      .references(() => pointsTable.id, {
        onDelete: "cascade",
      })
      .notNull(),
    userId: varchar("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userEndorsementsIndex: index().on(table.userId),
    pointEndorsementsIndex: index().on(table.pointId),
  })
);

export type InsertEndorsement = typeof endorsementsTable.$inferInsert;
export type SelectEndorsement = typeof endorsementsTable.$inferSelect;
export type Endorsement = InferColumnsDataTypes<
  typeof endorsementsTable._.columns
>;
