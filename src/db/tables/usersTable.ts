import {
  USER_INITIAL_CRED,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/constants/config";
import { InferColumnsDataTypes, sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable(
  "users",
  {
    id: varchar("id").primaryKey(),
    username: varchar("username").notNull(),
    cred: integer("cred").notNull().default(USER_INITIAL_CRED),
    bio: text("bio"),
    delegationUrl: varchar("delegation_url", { length: 255 }),
    discourseUsername: varchar("discourse_username", { length: 255 }),
    discourseCommunityUrl: varchar("discourse_community_url", { length: 255 }),
    discourseConsentGiven: boolean("discourse_consent_given")
      .notNull()
      .default(false),
    showReadReceipts: boolean("show_read_receipts").notNull().default(true),
    receiveReadReceipts: boolean("receive_read_receipts")
      .notNull()
      .default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    noNegativeCred: check("noNegativeCred", sql`${table.cred} >= 0`),
    usernameUniqueIndex: uniqueIndex("usernameUniqueIndex").on(
      sql`lower(${table.username})`
    ),
    usernameFormatConstraint: check(
      "usernameFormat",
      sql`LENGTH(${table.username}) BETWEEN ${USERNAME_MIN_LENGTH} AND ${USERNAME_MAX_LENGTH}
          AND ${table.username} ~ '^[a-zA-Z0-9][_a-zA-Z0-9]*[a-zA-Z0-9]$'`.inlineParams() //only letters, numbers and underscores; cannot start or end with an underscore
    ),
  })
);

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type User = InferColumnsDataTypes<typeof usersTable._.columns>;

export const insertUserSchema = createInsertSchema(usersTable, {
  username: (schema) =>
    schema
      .min(
        USERNAME_MIN_LENGTH,
        `must be at least ${USERNAME_MIN_LENGTH} characters long`
      )
      .max(
        USERNAME_MAX_LENGTH,
        `must be at most ${USERNAME_MAX_LENGTH} characters long`
      )
      .regex(
        /^[_a-zA-Z0-9]+$/,
        "can only contain letters, numbers and underscores"
      )
      .regex(/^(?!_).*(?<!_)$/, "cannot start or end with an underscore"),
});
