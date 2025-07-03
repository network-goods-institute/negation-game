import {
  pgTable,
  varchar,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { spacesTable } from "@/db/tables/spacesTable";
import { usersTable } from "@/db/tables/usersTable";

export const spaceAdminsTable = pgTable(
  "space_admins",
  {
    spaceId: varchar("space_id", { length: 100 })
      .references(() => spacesTable.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 })
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.spaceId, table.userId] }),
    spaceIdx: index("space_admins_space_idx").on(table.spaceId),
    userIdx: index("space_admins_user_idx").on(table.userId),
  })
);

export type InsertSpaceAdmin = typeof spaceAdminsTable.$inferInsert;
export type SelectSpaceAdmin = typeof spaceAdminsTable.$inferSelect;