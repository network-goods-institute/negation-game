"use server";

import { getSpace } from "@/actions/getSpace";
import { embeddingsTable, pointsWithDetailsView } from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import {
  restakesByPointSql,
  slashedAmountSql,
  doubtedAmountSql,
} from "./utils/pointSqlUtils";

export type SimilarPointsResult = Awaited<
  ReturnType<typeof fetchSimilarPoints>
>[number];

export const fetchSimilarPoints = async ({ query }: { query: string }) => {
  const space = await getSpace();
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
      restakesByPoint: restakesByPointSql(pointsWithDetailsView),
      slashedAmount: slashedAmountSql(pointsWithDetailsView),
      doubtedAmount: doubtedAmountSql(pointsWithDetailsView),
    })
    .from(embeddingsTable)
    .innerJoin(
      pointsWithDetailsView,
      eq(pointsWithDetailsView.pointId, embeddingsTable.id)
    )
    .where(and(gt(similarity, 0.5), eq(pointsWithDetailsView.space, space)))
    .orderBy((t) => desc(t.similarity))
    .limit(5)
    .then(addFavor);
};
