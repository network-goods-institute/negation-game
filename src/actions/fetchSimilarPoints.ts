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
      favor: sql<number>`
        COALESCE((
          SELECT favor 
          FROM point_favor_history 
          WHERE point_id = ${pointsWithDetailsView.id}
          AND event_type = 'favor_queried'
          ORDER BY event_time DESC 
          LIMIT 1
        ), 50)
      `.mapWith(Number),
    })
    .from(embeddingsTable)
    .innerJoin(
      pointsWithDetailsView,
      eq(pointsWithDetailsView.id, embeddingsTable.pointId)
    )
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(5);
};
