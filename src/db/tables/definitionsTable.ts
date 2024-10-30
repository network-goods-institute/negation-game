import { sql } from "drizzle-orm";
import { uniqueIndex } from "drizzle-orm/mysql-core";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";

export const definitionsTable = pgTable(
  "definitions",
  {
    term: varchar("term").primaryKey(),
    definition: text("definition").notNull(),
  },
  (table) => ({
    uniqueTermIndex: uniqueIndex("uniqueTermIndex").on(
      sql`lower(${table.term})`
    ),
  })
);
