"use server";

import {
  GOOD_ENOUGH_POINT_RATING,
  POINT_MAX_LENGHT,
  POINT_MIN_LENGHT,
} from "@/constants/config";
import { Point } from "@/db/tables/pointsTable";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

export interface EvaluateCounterpointArgs {
  negatedPointContent: Point["content"];
  counterpointContent: Point["content"];
}

export const rateAndRefineCounterpointAction = async ({
  negatedPointContent,
  counterpointContent,
}: EvaluateCounterpointArgs) => {
  const prompt = `You are a helpful assistant that improves the phrasing of counterpoints in a debate/discussion platform
Using this statement as the NEGATED POINT:
${negatedPointContent}
---

And this statement as the COUNTERPOINT:
${counterpointContent}
---

Considering that the user is proposing the COUNTERPOINT as a rebuttal of the NEGATED POINT, evaluate whether the COUNTERPOINT meets the criteria of a good counterpoint:
- Is a declarative statement
- Expresses a single idea (claim)
- Makes sense on its own
- Is orthographically correct (starts with a capital letter, ends with a period)
- Is grammatically correct
- Is concise
- Is easily understandable
- Is relevant to the NEGATED POINT
- Its claim is opposite and mutually exclusive to the claim in the NEGATED POINT

then, rate it from 1 to 10.

if it's rated below ${GOOD_ENOUGH_POINT_RATING}, provide SUCCINCT suggestions on how to improve it (They will be displayed in the UI below the COUNTERPOINT).

Also offer 3 rephrasings of the COUNTERPOINT that would make it better according to the criteria above.

The rephrasings MUST EXPRESS THE SAME MAIN IDEA as the COUNTERPOINT and they must meet all criteria above. Every rephrasing should be rated 10.
Try to stick as closely as possible to the original COUNTERPOINT in the rephrasings.

Write the rephrasings in a modern and straightforward way.
Avoid using fancy, outdated, or overly formal expressions.
Focus on being clear, concise, and easy to understand, as if you're explaining something to a friend in today's world in an accessible way.
`;

  const { object: counterpointEvaluation } = await generateObject({
    model: google("gemini-1.5-flash"),
    schema: z.object({
      rating: z
        .number()
        .min(1)
        .max(10)
        .int()
        .describe("rating of the counterpoint"),
      rephrasings: z
        .array(z.string().min(POINT_MIN_LENGHT).max(POINT_MAX_LENGHT))
        .describe("Suggested rephrasings of the COUNTERPOINT"),
      suggestions: z
        .string()
        .describe(
          "Suggestions for the user on how to improve the COUNTERPOINT"
        ),
    }),
    prompt,
  });

  return counterpointEvaluation;
};
