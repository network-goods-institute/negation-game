import { USERNAME_MAX_LENGHT, USERNAME_MIN_LENGHT } from "@/constants/config";
import { InferColumnsDataTypes, sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable(
  "users",
  {
    id: varchar("id").primaryKey(),
    username: varchar("username").notNull(),
    cred: integer("cred").notNull().default(0),
  },
  (table) => ({
    noNegativeCred: check("noNegativeCred", sql`${table.cred} >= 0`),
    usernameUniqueIndex: uniqueIndex("usernameUniqueIndex").on(
      sql`lower(${table.username})`
    ),
    usernameFormatConstraint: check(
      "usernameFormat",
      sql`LENGTH(${table.username}) BETWEEN ${USERNAME_MIN_LENGHT} AND ${USERNAME_MAX_LENGHT}
          AND ${table.username} ~ '^[a-zA-Z0-9][_a-zA-Z0-9]*[a-zA-Z0-9]$'`.inlineParams() //only letters, numbers and underscores; cannot start or end with an underscore
    ),
  })
);

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type User = InferColumnsDataTypes<typeof usersTable._.columns>;

export const insertUserSchema = createInsertSchema(usersTable, {
  username: (schema) =>
    schema.username
      .min(
        USERNAME_MIN_LENGHT,
        `must be at least ${USERNAME_MIN_LENGHT} characters long`
      )
      .max(
        USERNAME_MAX_LENGHT,
        `must be at most ${USERNAME_MAX_LENGHT} characters long`
      )
      .regex(
        /[_a-zA-Z0-9]+/,
        "can only contain letters, numbers and underscores"
      )
      .regex(/^(?!_).*(?<!_)$/, "cannot start or end with an underscore"),
});
