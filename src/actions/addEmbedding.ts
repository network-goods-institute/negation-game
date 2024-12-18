"use server";

import { getSpace } from "@/actions/getSpace";
import { embeddingsTable } from "@/db/schema";
import { Point } from "@/db/tables/pointsTable";
import { db } from "@/services/db";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

export const addEmbedding = async ({
  content,
  id: pointId,
}: Pick<Point, "content" | "id">) => {
  const embedding = (
    await embed({
      model: openai.embedding("text-embedding-3-small", { dimensions: 384 }),
      value: content,
    })
  ).embedding;

  const space = await getSpace();

  await db
    .insert(embeddingsTable)
    .values({ embedding, id: Number(pointId), space })
    .onConflictDoUpdate({
      target: [embeddingsTable.id],
      set: { embedding },
    })
    .execute();
};
