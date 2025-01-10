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

  const prompt = `You are a helpful assistant that generates insightful counterpoints for a debate/discussion platform.

${definitions.length > 0 ? `Here are some relevant definitions that might be useful:
${definitions.map(({ term, definition }) => `${term}: ${definition}`).join("\n")}

` : ''}STATEMENT TO COUNTER:
${point.content}

${negations.length > 0 ? "EXISTING COUNTERPOINTS:\n" + negations.map((negation) => negation.content).join("\n") : ""}

Generate 3 strong counterpoints that challenge the STATEMENT above. For each counterpoint:

- Present a perspective that is opposite and mutually exclusive to the original statement
- Think beyond simple word opposites - consider deeper implications, assumptions, or alternative frameworks
- Introduce relevant concepts or aspects that weren't explicitly mentioned in the original statement but are important to the discussion
- Make sure it's not redundant with existing counterpoints
- Keep it concise and clear (max ${POINT_MAX_LENGHT} characters)
- Make it a declarative statement that expresses a single idea
- Use neutral tone and avoid personal opinions
- Focus on logical assertions rather than mere disagreement
- Go straight to the point without opening remarks
- Ensure it makes sense on its own
- Use modern, straightforward language

Focus on being clear and insightful, as if you're explaining a thoughtful counterargument to a friend in today's world.`;

  const { elementStream } = await streamObject({
    model: google("gemini-1.5-flash"),
    output: "array",
    schema: z.string().describe("Content of the counterpoint"),
    prompt,
  });

  return elementStream;
};