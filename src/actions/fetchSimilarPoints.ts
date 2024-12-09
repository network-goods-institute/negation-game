"use server";

import { embeddingsTable, pointsWithDetailsView } from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { cosineDistance, desc, eq, gt, sql } from "drizzle-orm";

export const fetchSimilarPoints = async ({ query }: { query: string }) => {
  const embedding = (
    await embed({
      model: openai.embedding("text-embedding-3-small", { dimensions: 384 }),
      value: query,
    })
  ).embedding;

  const similarity = sql<number>`1 - (${cosineDistance(embeddingsTable.embedding, embedding)})`;

  return await db
    .select({
      similarity,
      ...getColumns(pointsWithDetailsView),
    })
    .from(embeddingsTable)
    .innerJoin(
      pointsWithDetailsView,
      eq(pointsWithDetailsView.pointId, embeddingsTable.pointId)
    )
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(5);
};
