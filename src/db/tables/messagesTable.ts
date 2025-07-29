import {
  boolean,
  pgTable,
  text,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./usersTable";
import { spacesTable } from "./spacesTable";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";

export const messagesTable = pgTable(
  "messages",
  {
    id: varchar("id", { length: 21 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    conversationId: varchar("conversation_id", { length: 42 }).notNull(),
    content: text("content").notNull(),
    senderId: varchar("sender_id", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    recipientId: varchar("recipient_id", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    space: varchar("space", { length: 100 })
      .notNull()
      .references(() => spacesTable.id, { onDelete: "cascade" }),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    isEdited: boolean("is_edited").default(false).notNull(),
    editedAt: timestamp("edited_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("messages_conversation_id_idx").on(
      table.conversationId
    ),
    senderIdIdx: index("messages_sender_id_idx").on(table.senderId),
    recipientIdIdx: index("messages_recipient_id_idx").on(table.recipientId),
    spaceIdx: index("messages_space_idx").on(table.space),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
    unreadIdx: index("messages_unread_idx").on(table.recipientId, table.isRead),
  })
);

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  sender: one(usersTable, {
    fields: [messagesTable.senderId],
    references: [usersTable.id],
    relationName: "sender",
  }),
  recipient: one(usersTable, {
    fields: [messagesTable.recipientId],
    references: [usersTable.id],
    relationName: "recipient",
  }),
  space: one(spacesTable, {
    fields: [messagesTable.space],
    references: [spacesTable.id],
  }),
}));

export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;

export function generateConversationId(
  userId1: string,
  userId2: string,
  spaceId: string
): string {
  const [user1, user2] = [userId1, userId2].sort();
  const combined = `${user1}_${user2}_${spaceId}`;
  const hash = combined.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `conv_${Math.abs(hash).toString(36)}`;
}
