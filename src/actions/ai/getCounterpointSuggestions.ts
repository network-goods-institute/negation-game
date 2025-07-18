"use server";

import { fetchPointNegations } from "@/actions/points/fetchPointNegations";
import { POINT_MAX_LENGTH } from "@/constants/config";
import { definitionsTable, pointsTable } from "@/db/schema";
import { db } from "@/services/db";
import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { withRetry } from "@/lib/utils/withRetry";

export const getCounterpointSuggestions = async (pointId: number) => {
  const point = await db
    .select({ content: pointsTable.content, keywords: pointsTable.keywords })
    .from(pointsTable)
    .where(and(eq(pointsTable.id, pointId), eq(pointsTable.isActive, true)))
    .limit(1)
    .then(([point]) => point);

  const [negations, definitions] = await Promise.all([
    fetchPointNegations(pointId),
    db
      .select()
      .from(definitionsTable)
      .where(
        point.keywords.length > 0
          ? sql`lower(${definitionsTable.term}) IN ${point.keywords}`
          : sql`1=0`
      )
      .execute(),
  ]);

  const prompt = `You are a helpful assistant that generates insightful counterpoints for a debate/discussion platform.

${
  definitions.length > 0
    ? `Here are some relevant definitions that might be useful:
${definitions.map(({ term, definition }) => `${term}: ${definition}`).join("\n")}

`
    : ""
}STATEMENT TO COUNTER:
${point.content}

${negations.length > 0 ? "EXISTING COUNTERPOINTS:\n" + negations.map((negation) => negation.content).join("\n") : ""}

Generate 3 strong counterpoints that challenge the STATEMENT above. For each counterpoint:

- Present a perspective that is opposite and mutually exclusive to the original statement
- Think beyond simple word opposites - consider deeper implications, assumptions, or alternative frameworks
- Introduce relevant concepts or aspects that weren't explicitly mentioned in the original statement but are important to the discussion
- Make sure it's not redundant with existing counterpoints
- Keep it concise and clear (max ${POINT_MAX_LENGTH} characters)
- Make it a declarative statement that expresses a single idea
- Use neutral tone and avoid personal opinions
- Focus on logical assertions rather than mere disagreement
- Go straight to the point without opening remarks
- Ensure it makes sense on its own
- Use modern, straightforward language
- Ensure proper punctuation and grammar, i.e. Start with capital letter, end with period.
- Match the language of the STATEMENT TO COUNTER.

Focus on being clear and insightful, as if you're explaining a thoughtful counterargument to a friend in today's world.`;

  const { elementStream } = await withRetry(async () => {
    return streamObject({
      model: openai("gpt-4o-mini"),
      output: "array",
      schema: z.string().describe("Content of the counterpoint"),
      prompt,
    });
  });

  return elementStream;
};
