import { db } from "./db";
import { pointsTable } from "@/db/tables/pointsTable";
import { embeddingsTable } from "@/db/tables/embeddingsTable";
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

async function generateEmbedding(text: string) {
  const response = await embed({
    model: openai.embedding("text-embedding-3-small", { dimensions: 384 }),
    value: text,
  });
  return response.embedding;
}

async function main() {
  const points = await db.select().from(pointsTable).execute();
  
  console.log(`Found ${points.length} points to process`);

  for (const point of points) {
    try {
      console.log(`Processing point ${point.id}: ${point.content.slice(0, 50)}...`);

      const embedding = await generateEmbedding(point.content);
      
      await db.insert(embeddingsTable).values({
        pointId: point.id,
        embedding: embedding,
      })
      .onConflictDoUpdate({
        target: embeddingsTable.pointId,
        set: { embedding: embedding }
      });

      console.log(`Successfully processed point ${point.id}`);
    } catch (error) {
      console.error(`Error processing point ${point.id}:`, error);
    }
  }

  console.log('Finished processing all points');
}

main()
  .catch(console.error)
  .finally(() => process.exit()); 