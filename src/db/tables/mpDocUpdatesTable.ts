import { mpDocsTable } from "@/db/tables/mpDocsTable";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  customType,
} from "drizzle-orm/pg-core";

// Define a bytea column type (drizzle version here doesn't export bytea for some reason)
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const mpDocUpdatesTable = pgTable(
  "mp_doc_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docId: text("doc_id")
      .notNull()
      .references(() => mpDocsTable.id, { onDelete: "cascade" }),
    // Binary Yjs update (bytea)
    updateBin: bytea("update_bin").notNull(),
    userId: text("user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    docIdCreatedAtIdx: index("mp_doc_updates_doc_id_created_at_idx").on(
      table.docId,
      table.createdAt
    ),
  })
);
