import { DEFAULT_SPACE } from "@/constants/config";
import { spacesTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import { uniqueIndex } from "drizzle-orm/mysql-core";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";

export const definitionsTable = pgTable(
  "definitions",
  {
    term: varchar("term").primaryKey(),
    definition: text("definition").notNull(),
    space: varchar("space")
      .references(() => spacesTable.id, {
        onDelete: "cascade",
      })
      .default(DEFAULT_SPACE),
  },
  (table) => ({
    uniqueTermIndex: uniqueIndex("uniqueTermIndex").on(
      sql`concat(${table.space},'-',lower(${table.term}))`
    ),
  })
);
