import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const mpNotificationTypeEnum = pgEnum("mp_notification_type", [
  "support",
  "negation",
  "objection",
  "comment",
  "upvote",
]);

export const mpNotificationsTable = pgTable(
  "mp_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id").notNull(),
    docId: text("doc_id").notNull(),
    nodeId: text("node_id"),
    edgeId: text("edge_id"),
    type: mpNotificationTypeEnum("type").notNull(),
    action: text("action"),
    actorUserId: varchar("actor_user_id"),
    actorUsername: varchar("actor_username"),
    title: text("title").notNull(),
    content: text("content"),
    metadata: jsonb("metadata"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("mp_notifications_user_idx").on(table.userId),
    docIdx: index("mp_notifications_doc_idx").on(table.docId),
    readIdx: index("mp_notifications_read_idx").on(table.readAt),
    createdIdx: index("mp_notifications_created_idx").on(table.createdAt),
  })
);

export type InsertMpNotification = typeof mpNotificationsTable.$inferInsert;
export type SelectMpNotification = typeof mpNotificationsTable.$inferSelect;

export const insertMpNotificationSchema = createInsertSchema(mpNotificationsTable);
export const selectMpNotificationSchema = createSelectSchema(mpNotificationsTable);
