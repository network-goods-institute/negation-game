import {
  pgTable,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const rationaleAssignmentsTable = pgTable("rationale_assignments", {
  id: varchar("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  userId: varchar("user_id").notNull(),
  spaceId: varchar("space_id").notNull(),
  assignedBy: varchar("assigned_by").notNull(),
  promptMessage: text("prompt_message"),
  required: boolean("required").notNull().default(false),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rationaleAssignmentsRelations = relations(
  rationaleAssignmentsTable,
  ({ one }) => ({
    topic: one(topicsTable, {
      fields: [rationaleAssignmentsTable.topicId],
      references: [topicsTable.id],
    }),
    assignedUser: one(usersTable, {
      fields: [rationaleAssignmentsTable.userId],
      references: [usersTable.id],
    }),
    assignedByUser: one(usersTable, {
      fields: [rationaleAssignmentsTable.assignedBy],
      references: [usersTable.id],
    }),
    space: one(spacesTable, {
      fields: [rationaleAssignmentsTable.spaceId],
      references: [spacesTable.id],
    }),
  })
);

import { topicsTable } from "./topicsTable";
import { usersTable } from "./usersTable";
import { spacesTable } from "./spacesTable";
