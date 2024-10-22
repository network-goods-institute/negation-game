import { embeddingsTable, pointsTable } from "@/db/schema";
import { formatPointForEmbedding } from "@/lib/ai/formatPointForEmbedding";
import { db } from "@/services/db";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { eq } from "drizzle-orm";

export const maxDuration = 30;

export async function GET(
  req: Request,
  { params: { pointId } }: { params: { pointId: string } }
) {
  if (!pointId) throw new Error("No pointId provided");

  const point = await db.query.points.findFirst({
    where: eq(pointsTable.id, Number(pointId)),
    columns: {
      title: true,
      content: true,
    },
  });

  if (!point) throw new Error(`Point ${pointId} not found`);

  const embedding = (
    await embed({
      model: openai.embedding("text-embedding-3-small", { dimensions: 384 }),
      value: formatPointForEmbedding(point),
    })
  ).embedding;

  await db
    .insert(embeddingsTable)
    .values({ embedding, id: Number(pointId) })
    .onConflictDoUpdate({
      target: [embeddingsTable.id],
      set: { embedding },
    })
    .execute();

  return new Response(null, {
    status: 204,
  });
}
