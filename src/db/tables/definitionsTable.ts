import { spacesTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import { uniqueIndex } from "drizzle-orm/pg-core";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";

export const definitionsTable = pgTable(
  "definitions",
  {
    term: varchar("term").primaryKey(),
    definition: text("definition").notNull(),
    space: varchar("space").references(() => spacesTable.id, {
      onDelete: "cascade",
    }),
  },
  (table) => ({
    uniqueTermIndex: uniqueIndex("uniqueTermIndex").on(
      sql`${table.space} || '-' || lower(${table.term})`
    ),
  })
);
