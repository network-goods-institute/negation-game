import {
  jsonb,
  pgTable,
  varchar,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { spacesTable } from "@/db/tables/spacesTable";
import { usersTable } from "@/db/tables/usersTable";
import { viewpointsTable } from "@/db/tables/viewpointsTable";

export const experimentalGraphDocsTable = pgTable(
  "experimental_graph_docs",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    space: varchar("space", { length: 100 }).references(() => spacesTable.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 200 })
      .notNull()
      .default("Untitled Experimental Rationale"),
    doc: jsonb("doc").notNull().default({}),
    publishedViewpointId: varchar("published_viewpoint_id", {
      length: 255,
    }).references(() => viewpointsTable.id, { onDelete: "set null" }),
    createdBy: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => ({
    spaceIdx: index("experimental_graph_docs_space_idx").on(table.space),
    publishedIdx: index("experimental_graph_docs_published_idx").on(
      table.publishedViewpointId
    ),
  })
);

export type ExperimentalGraphDoc =
  typeof experimentalGraphDocsTable.$inferSelect;
