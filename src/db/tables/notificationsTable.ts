import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
  pgEnum,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const notificationTypeEnum = pgEnum("notification_type", [
  "endorsement",
  "negation",
  "restake",
  "doubt",
  "doubt_reduction",
  "slash",
  "rationale_mention",
  "message",
  "viewpoint_published",
  "scroll_proposal",
]);

export const sourceEntityTypeEnum = pgEnum("source_entity_type", [
  "point",
  "rationale",
  "chat",
  "viewpoint",
  "proposal",
  "user",
]);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    sourceUserId: varchar("source_user_id"),
    sourceEntityId: varchar("source_entity_id"),
    sourceEntityType: sourceEntityTypeEnum("source_entity_type"),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content"),
    aiSummary: text("ai_summary"),
    metadata: jsonb("metadata"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    space: varchar("space").notNull(),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    sourceUserIdx: index("notifications_source_user_idx").on(
      table.sourceUserId
    ),
    sourceEntityIdx: index("notifications_source_entity_idx").on(
      table.sourceEntityId
    ),
    spaceIdx: index("notifications_space_idx").on(table.space),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
    readAtIdx: index("notifications_read_at_idx").on(table.readAt),
  })
);

export type InsertNotification = typeof notificationsTable.$inferInsert;
export type SelectNotification = typeof notificationsTable.$inferSelect;
export type Notification = SelectNotification;

export const insertNotificationSchema = createInsertSchema(notificationsTable);
export const selectNotificationSchema = createSelectSchema(notificationsTable);
