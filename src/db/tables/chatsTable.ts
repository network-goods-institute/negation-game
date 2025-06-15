import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./usersTable";

export const chatsTable = pgTable(
  "chats",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    spaceId: text("space_id").notNull(),
    title: text("title").notNull(),
    messages: jsonb("messages").notNull().default("[]"),
    state_hash: text("state_hash"),
    graph: jsonb("graph").$type<{
      nodes: any[];
      edges: any[];
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    is_deleted: boolean("is_deleted").notNull().default(false),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
    is_shared: boolean("is_shared").notNull().default(false),
    share_id: text("share_id").unique(),
    distillRationaleId: text("distill_rationale_id"),
  },
  (table) => ({
    userIdIdx: index("chats_user_id_idx").on(table.userId),
    spaceIdIdx: index("chats_space_id_idx").on(table.spaceId),
    createdAtIdx: index("chats_created_at_idx").on(table.createdAt),
    isDeletedIdx: index("chats_is_deleted_idx").on(table.is_deleted),
    isSharedIdx: index("chats_is_shared_idx").on(table.is_shared),
  })
);

export const chatsRelations = relations(chatsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [chatsTable.userId],
    references: [usersTable.id],
  }),
}));
