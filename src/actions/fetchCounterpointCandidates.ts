"use server";

import { embeddingsTable, negationsTable, pointsTable } from "@/db/schema";
import { Point } from "@/db/tables/pointsTable";
import { db } from "@/services/db";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import {
  and,
  cosineDistance,
  desc,
  eq,
  exists,
  gt,
  ne,
  or,
  sql,
} from "drizzle-orm";

export interface FetchNegationCandidatesArgs {
  negatedPointId: Point["id"];
  counterpointContent: string;
}

export const fetchCounterpointCandidates = async ({
  negatedPointId,
  counterpointContent,
}: FetchNegationCandidatesArgs) => {
  const embedding = (
    await embed({
      model: openai.embedding("text-embedding-3-small", { dimensions: 384 }),
      value: counterpointContent,
    })
  ).embedding;

  const similarity = sql<number>`1 - (${cosineDistance(embeddingsTable.embedding, embedding)})`;

  const isCounterpoint = exists(
    db
      .select()
      .from(negationsTable)
      .where(
        or(
          sql`${negationsTable.olderPointId} = ${pointsTable.id} AND ${negationsTable.newerPointId} = ${negatedPointId}`,
          sql`${negationsTable.newerPointId} = ${pointsTable.id} AND ${negationsTable.olderPointId} = ${negatedPointId}`
        )
      )
  ).mapWith(Boolean);

  return await db
    .select({
      similarity,
      id: pointsTable.id,
      content: pointsTable.content,
      createdAt: pointsTable.createdAt,
      createdBy: pointsTable.createdBy,
      isCounterpoint,
    })
    .from(embeddingsTable)
    .innerJoin(pointsTable, eq(pointsTable.id, embeddingsTable.id))
    .where(and(gt(similarity, 0.5), ne(pointsTable.id, negatedPointId)))
    .orderBy((t) => desc(t.similarity))
    .limit(5);
};
