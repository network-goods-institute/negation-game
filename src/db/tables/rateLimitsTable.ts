import {
  pgTable,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const rateLimitsTable = pgTable(
  "rate_limits",
  {
    id: varchar("id").primaryKey(), // Format: "key:userId" or "key:identifier"
    count: integer("count").notNull().default(1),
    resetTime: timestamp("reset_time").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    resetTimeIdx: index("rate_limits_reset_time_idx").on(table.resetTime),
  })
);

export type InsertRateLimit = typeof rateLimitsTable.$inferInsert;
export type SelectRateLimit = typeof rateLimitsTable.$inferSelect;