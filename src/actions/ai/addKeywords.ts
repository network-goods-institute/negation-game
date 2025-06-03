"use server";

import { Point, pointsTable } from "@/db/tables/pointsTable";
import { db } from "@/services/db";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { withRetry } from "@/lib/utils/withRetry";
import { openai } from "@ai-sdk/openai";

export const addKeywords = async ({
  content,
  id,
}: Pick<Point, "content" | "id">) => {
  const keywords = (
    await withRetry(async () => {
      return generateObject({
        model: openai("gpt-4o-mini"),
        output: "array",
        schema: z.string().describe("Keyword present in the content"),
        prompt: `Extract only the most relevant keywords from the following statement. Respond in the same language as the statement: ${content}`,
      });
    })
  ).object;

  await db
    .update(pointsTable)
    .set({ keywords: keywords.map((keyword) => keyword.toLowerCase()) })
    .where(eq(pointsTable.id, id))
    .execute();
};
