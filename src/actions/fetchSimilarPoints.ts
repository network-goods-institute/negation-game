"use server";

import { getSpace } from "@/actions/getSpace";
import {
  embeddingsTable,
  pointsWithDetailsView,
  effectiveRestakesView,
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";

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
      restakesByPoint: sql<number>`
        COALESCE(
          (SELECT SUM(er1.amount)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}
           AND er1.slashed_amount < er1.amount), 
          0
        )
      `.mapWith(Number),
      slashedAmount: sql<number>`
        COALESCE(
          (SELECT SUM(er1.slashed_amount)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}), 
          0
        )
      `.mapWith(Number),
      doubtedAmount: sql<number>`
        COALESCE(
          (SELECT SUM(er1.doubted_amount)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}), 
          0
        )
      `.mapWith(Number),
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
