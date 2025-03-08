import { DEFAULT_SPACE } from "@/constants/config";
import { spacesTable } from "@/db/schema";
import { InferColumnsDataTypes, sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const pointsTable = pgTable("points", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  keywords: text("keywords")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  space: varchar("space")
    .references(() => spacesTable.id, {
      onDelete: "cascade",
    })
    .default(DEFAULT_SPACE),
  isCommand: boolean("is_command").notNull().default(false),
});

export type InsertPoint = Omit<
  typeof pointsTable.$inferInsert,
  "id" | "createdAt"
>;
export type SelectPoint = typeof pointsTable.$inferSelect;
export type Point = InferColumnsDataTypes<typeof pointsTable._.columns>;

export const insertPointSchema = createInsertSchema(pointsTable);
