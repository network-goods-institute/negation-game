"use server";

import { fetchPointNegations } from "@/actions/fetchPointNegations";
import { POINT_MAX_LENGHT } from "@/constants/config";
import { definitionsTable, pointsTable } from "@/db/schema";
import { db } from "@/services/db";
import { openai } from "@ai-sdk/openai";
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

    Generate 3 short (max ${POINT_MAX_LENGHT} characters) different counterpoints to the following statement: ${point.content}`;

  const { elementStream } = await streamObject({
    model: openai("gpt-4o-mini"),
    output: "array",
    schema: z.string().describe("Content of the counterpoint"),
    prompt,
  });

  // Consume the stream server-side and return the array to prevent stream conflicts
  const suggestions: string[] = [];
  const reader = elementStream.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    suggestions.push(value);
  }

  return suggestions;
};
