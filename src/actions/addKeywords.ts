"use server";

import { Point, pointsTable } from "@/db/tables/pointsTable";
import { db } from "@/services/db";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const addKeywords = async ({
  content,
  id,
}: Pick<Point, "content" | "id">) => {
  const keywords = (
    await generateObject({
      model: google("gemini-1.5-flash"),
      output: "array",
      schema: z.string().describe("Keyword present in the content"),
      prompt: `Extract only the most relevant keywords from the following statement: ${content}`,
    })
  ).object;

  await db
    .update(pointsTable)
    .set({ keywords: keywords.map((keyword) => keyword.toLowerCase()) })
    .where(eq(pointsTable.id, id))
    .execute();
};
