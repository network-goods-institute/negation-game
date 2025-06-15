import { spacesTable } from "@/db/schema";
import { pointsTable } from "@/db/tables/pointsTable";
import { InferColumnsDataTypes } from "drizzle-orm";
import { pgTable, serial, varchar, vector, index } from "drizzle-orm/pg-core";

export const embeddingsTable = pgTable(
  "embeddings",
  {
    id: serial("point_id")
      .primaryKey()
      .references(() => pointsTable.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 384 }),
    space: varchar("space").references(() => spacesTable.id, {
      onDelete: "cascade",
    }),
  },
  (table) => ({
    embeddingIndex: index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);

export type InsertEmbedding = typeof embeddingsTable.$inferInsert;
export type SelectEmbedding = typeof embeddingsTable.$inferSelect;
export type Embedding = InferColumnsDataTypes<typeof embeddingsTable._.columns>;
