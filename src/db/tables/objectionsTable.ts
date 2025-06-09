import { spacesTable, usersTable } from "@/db/schema";
import { pointsTable } from "@/db/tables/pointsTable";
import { negationsTable } from "@/db/tables/negationsTable";
import { endorsementsTable } from "@/db/tables/endorsementsTable";
import { InferColumnsDataTypes } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const objectionsTable = pgTable(
  "objections",
  {
    id: serial("id").primaryKey(),
    objectionPointId: integer("objection_point_id")
      .references(() => pointsTable.id, { onDelete: "cascade" })
      .notNull(),
    targetPointId: integer("target_point_id")
      .references(() => pointsTable.id, { onDelete: "cascade" })
      .notNull(),
    contextPointId: integer("context_point_id")
      .references(() => pointsTable.id, { onDelete: "cascade" })
      .notNull(),
    parentEdgeId: integer("parent_edge_id")
      .references(() => negationsTable.id, { onDelete: "cascade" })
      .notNull(),
    endorsementId: integer("endorsement_id").references(
      () => endorsementsTable.id,
      { onDelete: "cascade" }
    ),
    createdBy: varchar("created_by")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    space: varchar("space")
      .references(() => spacesTable.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    objectionPointIndex: index("objectionPointIndex").on(
      table.objectionPointId
    ),
    targetPointIndex: index("targetPointIndex").on(table.targetPointId),
    contextPointIndex: index("contextPointIndex").on(table.contextPointId),
    parentEdgeIndex: index("parentEdgeIndex").on(table.parentEdgeId),
    uniqueObjectionConstraint: unique("uniqueObjection").on(
      table.objectionPointId,
      table.targetPointId,
      table.contextPointId,
      table.parentEdgeId
    ),
  })
);

export type InsertObjection = typeof objectionsTable.$inferInsert;
export type SelectObjection = typeof objectionsTable.$inferSelect;
export type Objection = InferColumnsDataTypes<typeof objectionsTable._.columns>;
