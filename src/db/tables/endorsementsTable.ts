import { spacesTable } from "@/db/schema";
import { pointsTable } from "@/db/tables/pointsTable";
import { usersTable } from "@/db/tables/usersTable";
import { InferColumnsDataTypes, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
  check,
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
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id, { onDelete: "set null" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    space: varchar("space", { length: 100 })
      .notNull()
      .references(() => spacesTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userEndorsementsIndex: index("endorsements_user_idx").on(table.userId),
    pointEndorsementsIndex: index("endorsements_point_idx").on(table.pointId),
    spaceIdx: index("endorsements_space_idx").on(table.space),
    createdAtIdx: index("endorsements_created_at_idx").on(table.createdAt),
    positiveCred: check("positive_cred", sql`${table.cred} > 0`),
  })
);

export type InsertEndorsement = Omit<
  typeof endorsementsTable.$inferInsert,
  "id" | "createdAt"
>;
export type SelectEndorsement = typeof endorsementsTable.$inferSelect;
export type Endorsement = InferColumnsDataTypes<
  typeof endorsementsTable._.columns
>;
