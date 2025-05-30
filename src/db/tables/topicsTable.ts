import { InferColumnsDataTypes } from "drizzle-orm";
import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { spacesTable } from "@/db/tables/spacesTable";

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  space: varchar("space")
    .references(() => spacesTable.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  discourseUrl: varchar("discourse_url", { length: 255 }).notNull().default(""),
});

export type InsertTopic = typeof topicsTable.$inferInsert;
export type Topic = InferColumnsDataTypes<typeof topicsTable._.columns>;
