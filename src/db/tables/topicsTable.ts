import { InferColumnsDataTypes } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { spacesTable } from "@/db/tables/spacesTable";

export const topicsTable = pgTable(
  "topics",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    space: varchar("space", { length: 100 })
      .references(() => spacesTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    discourseUrl: varchar("discourse_url", { length: 255 })
      .notNull()
      .default(""),
  },
  (table) => ({
    spaceIdx: index("topics_space_idx").on(table.space),
    nameIdx: index("topics_name_idx").on(table.name),
  })
);

export type InsertTopic = Omit<
  typeof topicsTable.$inferInsert,
  "id" | "createdAt"
>;
export type Topic = InferColumnsDataTypes<typeof topicsTable._.columns>;
