"use server";

import {
  embeddingsTable,
  endorsementsTable,
  negationsTable,
  pointsTable,
} from "@/db/schema";
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
      amountNegations: sql<number>`
      COALESCE((
        SELECT COUNT(*)
        FROM (
          SELECT older_point_id AS point_id FROM ${negationsTable}
          UNION ALL
          SELECT newer_point_id AS point_id FROM ${negationsTable}
        ) sub
        WHERE point_id = ${pointsTable.id}
      ), 0)
    `.mapWith(Number),
      amountSupporters: sql<number>`
      COALESCE((
        SELECT COUNT(DISTINCT ${endorsementsTable.userId})
        FROM ${endorsementsTable}
        WHERE ${endorsementsTable.pointId} = ${pointsTable.id}
      ), 0)
    `.mapWith(Number),
      cred: sql<number>`
      COALESCE((
        SELECT SUM(${endorsementsTable.cred})
        FROM ${endorsementsTable}
        WHERE ${endorsementsTable.pointId} = ${pointsTable.id}
      ), 0)
    `.mapWith(Number),
    negationsCred: sql<number>`
      COALESCE((
        SELECT SUM(${endorsementsTable.cred})
        FROM ${endorsementsTable}
        WHERE ${endorsementsTable.pointId} IN (
          SELECT newer_point_id
          FROM ${negationsTable}
          WHERE older_point_id = ${pointsTable.id}
          UNION
          SELECT older_point_id
          FROM ${negationsTable}
          WHERE newer_point_id = ${pointsTable.id}
        )
      ), 0)
    `.mapWith(Number),
    })
    .from(embeddingsTable)
    .innerJoin(pointsTable, eq(pointsTable.id, embeddingsTable.id))
    .where(and(gt(similarity, 0.5), ne(pointsTable.id, negatedPointId)))
    .orderBy((t) => desc(t.similarity))
    .limit(5);
};
