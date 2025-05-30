import { spacesTable, usersTable } from "@/db/schema";
import { pointsTable } from "@/db/tables/pointsTable";
import { InferColumnsDataTypes, lt } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const negationsTable = pgTable(
  "negations",
  {
    id: serial("id").primaryKey(),
    olderPointId: serial("older_point_id").references(() => pointsTable.id, {
      onDelete: "cascade",
    }),
    newerPointId: serial("newer_point_id").references(() => pointsTable.id, {
      onDelete: "cascade",
    }),
    createdBy: varchar("created_by").references(() => usersTable.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    space: varchar("space").references(() => spacesTable.id, {
      onDelete: "cascade",
    }),
  },
  (table) => ({
    olderPointFirstConstraint: check(
      "olderPointFirst",
      lt(table.olderPointId, table.newerPointId)
    ),
    olderPointIndex: index("olderPointIndex").on(table.olderPointId),
    newerPointIndex: index("newerPointIndex").on(table.newerPointId),
    uniqueNegationsConstraint: unique("uniqueNegation").on(
      table.olderPointId,
      table.newerPointId
    ),
  })
);

export type InsertNegation = typeof negationsTable.$inferInsert;
export type SelectNegation = typeof negationsTable.$inferSelect;
export type Negation = InferColumnsDataTypes<typeof negationsTable._.columns>;
