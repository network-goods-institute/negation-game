import { InferColumnsDataTypes } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const translationsTable = pgTable(
  "translations",
  {
    id: serial("id").primaryKey(),
    originalText: text("original_text").notNull(),
    language: varchar("language", { length: 10 }).notNull(),
    translatedText: text("translated_text").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueTranslation: uniqueIndex("unique_translation").on(
      table.originalText,
      table.language
    ),
  })
);

export type Translation = InferColumnsDataTypes<
  typeof translationsTable._.columns
>;
