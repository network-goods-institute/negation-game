import { pointsTable } from "@/db/tables/pointsTable";
import { InferColumnsDataTypes } from "drizzle-orm";
import { pgTable, serial, vector } from "drizzle-orm/pg-core";

export const embeddingsTable = pgTable(
  "embeddings",
  {
    pointId: serial("point_id").primaryKey(),
    embedding: vector("embedding", { dimensions: 384 }),
  }
  // (table) => ({
  //   embeddingIndex: index("embeddingIndex").using(
  //     "hnsw",
  //     table.embedding.op("vector_cosine_ops")
  //   ),
  // })
);

export type InsertEmbedding = typeof embeddingsTable.$inferInsert;
export type SelectEmbedding = typeof embeddingsTable.$inferSelect;
export type Embedding = InferColumnsDataTypes<typeof embeddingsTable._.columns>;
