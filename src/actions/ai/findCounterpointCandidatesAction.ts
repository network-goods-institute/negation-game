"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import {
  embeddingsTable,
  endorsementsTable,
  negationsTable,
  pointsTable,
} from "@/db/schema";
import { Point } from "@/db/tables/pointsTable";
import { addFavor } from "@/db/utils/addFavor";
import { db } from "@/services/db";
import { openai } from "@ai-sdk/openai";
import { embed, generateObject } from "ai";
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
import { z } from "zod";
import { withRetry } from "@/lib/utils/withRetry";
import {
  restakesByPointSql,
  slashedAmountSql,
  doubtedAmountSql,
} from "@/actions/utils/pointSqlUtils";

export interface FindCounterpointCandidatesArgs {
  negatedPointId: Point["id"];
  negatedPointContent: Point["content"];
  counterpointContent: Point["content"];
}

export const findCounterpointCandidatesAction = async ({
  negatedPointId,
  counterpointContent,
}: FindCounterpointCandidatesArgs) => {
  const space = await getSpace();

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

  const similarPoints = await db
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
      restakesByPoint: restakesByPointSql(pointsTable),
      slashedAmount: slashedAmountSql(pointsTable),
      doubtedAmount: doubtedAmountSql(pointsTable),
    })
    .from(embeddingsTable)
    .innerJoin(pointsTable, eq(pointsTable.id, embeddingsTable.id))
    .where(
      and(
        gt(similarity, 0.5),
        ne(pointsTable.id, negatedPointId),
        eq(pointsTable.space, space)
      )
    )
    .orderBy((t) => desc(t.similarity))
    .limit(10)
    .then(addFavor);

  const prompt = `Given these statements, where the preceding number is the id:

${similarPoints.map(({ id, content }) => `${id}: ${content}`).join("\n---\n")}

Using this statement as the COUNTERPOINT CANDIDATE:
${counterpointContent}
---

Identify the IDs of statements that are similar in meaning, express the same idea or similar as the COUNTERPOINT CANDIDATE.

return no results if no statements meet the criteria.
Match the input language, do not translate to English.
    `;

  const {
    object: viableCounterpointIds,
    toJsonResponse,
    finishReason,
  } = await withRetry(async () => {
    return generateObject({
      model: openai("gpt-4o-mini"),
      output: "array",
      schema: z.number().describe("id of the statement"),
      prompt,
    });
  });

  return similarPoints.filter(({ id }) => viableCounterpointIds.includes(id));
};
