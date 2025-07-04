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

export const topicAssignmentsTable = pgTable(
  "topic_assignments",
  {
    topicId: integer("topic_id")
      .references(() => topicsTable.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    required: boolean("required").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.topicId, table.userId] }),
    topicIdx: index("topic_assignments_topic_idx").on(table.topicId),
    userIdx: index("topic_assignments_user_idx").on(table.userId),
  })
);

export type InsertTopicAssignment = typeof topicAssignmentsTable.$inferInsert;
export type SelectTopicAssignment = typeof topicAssignmentsTable.$inferSelect;