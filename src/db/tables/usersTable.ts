import {
  USER_INITIAL_CRED,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/constants/config";
import { InferColumnsDataTypes, sql, eq } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable(
  "users",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    username: varchar("username", { length: USERNAME_MAX_LENGTH }).notNull(),
    usernameCanonical: varchar("username_canonical", {
      length: USERNAME_MAX_LENGTH,
    }).notNull(),
    cred: integer("cred").notNull().default(USER_INITIAL_CRED),
    bio: varchar("bio", { length: 1000 }),
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
    siteAdmin: boolean("site_admin").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    noNegativeCred: check("noNegativeCred", sql`${table.cred} >= 0`),
    usernameUniqueIndex: uniqueIndex("usernameUniqueIndex").on(
      table.usernameCanonical
    ),
    usernameFormatConstraint: check(
      "usernameFormat",
      sql`LENGTH(${table.username}) BETWEEN ${USERNAME_MIN_LENGTH} AND ${USERNAME_MAX_LENGTH}
          AND ${table.usernameCanonical} ~ '^[a-z0-9][_a-z0-9]*[a-z0-9]$'`.inlineParams()
    ),
    softDeleteConsistency: check(
      "softDeleteConsistency",
      sql`(${table.isActive} = true AND ${table.deletedAt} IS NULL) OR (${table.isActive} = false AND ${table.deletedAt} IS NOT NULL)`
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
        /^[a-zA-Z0-9][_a-zA-Z0-9]*[a-zA-Z0-9]$/,
        "must start and end with letter/number, can contain underscores in between"
      ),
  bio: (schema) =>
    schema.max(1000, "bio must be at most 1000 characters long").optional(),
});

export function normalizeUsername(username: string): string {
  return username.toLowerCase();
}

export function createUserData(userData: {
  id: string;
  username: string;
  bio?: string;
  cred?: number;
}): InsertUser {
  return {
    id: userData.id,
    username: userData.username,
    usernameCanonical: normalizeUsername(userData.username),
    cred: userData.cred ?? USER_INITIAL_CRED,
    bio: userData.bio ?? null,
    delegationUrl: null,
    discourseUsername: null,
    discourseCommunityUrl: null,
    discourseConsentGiven: false,
    showReadReceipts: true,
    receiveReadReceipts: true,
    isActive: true,
    deletedAt: null,
  };
}

export function softDeleteUserData(): { isActive: false; deletedAt: Date } {
  return {
    isActive: false,
    deletedAt: new Date(),
  };
}

export function restoreUserData(): { isActive: true; deletedAt: null } {
  return {
    isActive: true,
    deletedAt: null,
  };
}
export const activeUsersFilter = eq(usersTable.isActive, true);
