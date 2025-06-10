import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const digestFrequencyEnum = pgEnum("digest_frequency", [
  "none",
  "daily",
  "weekly",
]);

export const notificationPreferencesTable = pgTable(
  "notification_preferences",
  {
    userId: varchar("user_id").primaryKey(),
    endorsementNotifications: boolean("endorsement_notifications")
      .notNull()
      .default(true),
    negationNotifications: boolean("negation_notifications")
      .notNull()
      .default(true),
    restakeNotifications: boolean("restake_notifications")
      .notNull()
      .default(true),
    rationaleNotifications: boolean("rationale_notifications")
      .notNull()
      .default(true),
    messageNotifications: boolean("message_notifications")
      .notNull()
      .default(true),
    scrollProposalNotifications: boolean("scroll_proposal_notifications")
      .notNull()
      .default(false),
    digestFrequency: digestFrequencyEnum("digest_frequency")
      .notNull()
      .default("daily"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export type InsertNotificationPreferences =
  typeof notificationPreferencesTable.$inferInsert;
export type SelectNotificationPreferences =
  typeof notificationPreferencesTable.$inferSelect;
export type NotificationPreferences = SelectNotificationPreferences;

export const insertNotificationPreferencesSchema = createInsertSchema(
  notificationPreferencesTable
);
export const selectNotificationPreferencesSchema = createSelectSchema(
  notificationPreferencesTable
);
