"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { embeddingsTable } from "@/db/schema";
import { pointsTable } from "@/db/tables/pointsTable";
import type { Point } from "@/db/tables/pointsTable";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";
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

  const existingPoint = await db
    .select({ id: pointsTable.id })
    .from(pointsTable)
    .where(eq(pointsTable.id, Number(pointId)))
    .limit(1);

  if (existingPoint.length === 0) {
    return;
  }

  await db
    .insert(embeddingsTable)
    .values({ embedding, id: Number(pointId), space })
    .onConflictDoUpdate({
      target: [embeddingsTable.id],
      set: { embedding },
    })
    .execute();
};
