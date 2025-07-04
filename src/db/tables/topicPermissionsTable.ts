import {
  pgTable,
  integer,
  varchar,
  timestamp,
  index,
  primaryKey,
  boolean,
} from "drizzle-orm/pg-core";
import { topicsTable } from "@/db/tables/topicsTable";
import { usersTable } from "@/db/tables/usersTable";

export const topicPermissionsTable = pgTable(
  "topic_permissions",
  {
    topicId: integer("topic_id")
      .references(() => topicsTable.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    canCreateRationale: boolean("can_create_rationale").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.topicId, table.userId] }),
    topicIdx: index("topic_permissions_topic_idx").on(table.topicId),
    userIdx: index("topic_permissions_user_idx").on(table.userId),
  })
);

export type InsertTopicPermission = typeof topicPermissionsTable.$inferInsert;
export type SelectTopicPermission = typeof topicPermissionsTable.$inferSelect;