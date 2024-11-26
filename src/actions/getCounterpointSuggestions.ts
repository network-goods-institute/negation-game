"use server";

import { fetchPointNegations } from "@/actions/fetchPointNegations";
import { POINT_MAX_LENGHT } from "@/constants/config";
import { definitionsTable, pointsTable } from "@/db/schema";
import { db } from "@/services/db";
import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

export const getCounterpointSuggestions = async (pointId: number) => {
  const point = await db
    .select({ content: pointsTable.content, keywords: pointsTable.keywords })
    .from(pointsTable)
    .where(eq(pointsTable.id, pointId))
    .limit(1)
    .then(([point]) => point);

  const [negations, definitions] = await Promise.all([
    fetchPointNegations(pointId),
    db
      .select()
      .from(definitionsTable)
      .where(sql`lower(${definitionsTable.term}) IN ${point.keywords}`)
      .execute(),
  ]);

  const prompt = `Here are some definitions that might be useful:
    ${definitions.map(({ term, definition }) => `${term}: ${definition}`).join("\n")}

    ${negations.length > 0 ? "Here are the existing counterpoints to the statement:]\n" + negations.map((negation) => negation.content).join("\n") : ""}

    Generate 3 short (max ${POINT_MAX_LENGHT} characters) statements that are opposite and mutually exclusive to the following statement: ${point.content}. Make sure they are not redundant and that their underlying ideas are not already expressed in the list of counterpoints above.`;

  const { elementStream } = await streamObject({
    model: google("gemini-1.5-flash"),
    output: "array",
    schema: z.string().describe("Content of the counterpoint"),
    prompt,
  });

  return elementStream;
};
