"use server";

import {
  GOOD_ENOUGH_POINT_RATING,
  POINT_MAX_LENGTH,
  POINT_MIN_LENGTH,
} from "@/constants/config";
import { Point } from "@/db/tables/pointsTable";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { withRetry } from "@/lib/withRetry";

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
- Is orthographically correct: starts with a capital letter, ends with a period.
- Is grammatically correct
- Is concise and articulate
- Is not vague or ambiguous
- Is easily understandable
- Is relevant to the NEGATED POINT
- Is not phrased as a personal opinion, using neutral tone instead
- Presents logical assertions rather than just disagreement
- Does not include opening remarks, going straight to the point
- Focus directly on the subject matter without unnecessary framing
- Its claim is opposite and mutually exclusive to the claim in the NEGATED POINT

Some conditions that require immediate rejection and a score of 1:
- The user provided counterpoint has improper punctuation and grammar, i.e. does not start with a capital letter or does not end with a period.

then, rate it from 1 to 10.
The rating should not take into account morality, ethics or the merit of the claim, but rather how well it meets the criteria above.

if it's rated below ${GOOD_ENOUGH_POINT_RATING}, provide feedback on how to improve it (It will be displayed in the UI below the COUNTERPOINT).
- The feedback should focus on a single aspect that if improved would make the COUNTERPOINT better according to the criteria above. It does not need to be comprehensive as there can be further iteration later.
- The feedback should start with "It could be improved by..." and be clear, concise, and actionable.
- The feedback should not be opinionated in regards to the claim of the COUNTERPOINT, but rather focus on the clarity, conciseness, structure and relevance of the statement.

Also offer 3 rephrasings of the COUNTERPOINT that would make it better according to the criteria above.

- The rephrasings MUST EXPRESS THE SAME MAIN IDEA as the COUNTERPOINT.
- The rephrasings MUST MEET ALL CRITERIA ABOVE, so that they would be rated 10.
- The rephrasings MUST STICK AS CLOSELY AS POSSIBLE to the original COUNTERPOINT.
- The rephrasings must use modern and straightforward way.
- The rephrasings must avoid using fancy, outdated, or overly formal expressions.
- The rephrasings should not include opening remarks, going straight to the point.
- The rephrasings should contain between ${POINT_MIN_LENGTH} and ${POINT_MAX_LENGTH} characters.

Focus on being clear, concise, and easy to understand, as if you're explaining something to a friend in today's world in an accessible way.

`;

  const { object: counterpointEvaluation } = await withRetry(async () => {
    return generateObject({
      model: google("gemini-2.0-flash"),
      schema: z.object({
        rating: z
          .number()
          .min(1)
          .max(10)
          .int()
          .describe("rating of the counterpoint"),
        suggestions: z
          .array(z.string())
          .describe("Suggested rephrasings of the COUNTERPOINT"),
        feedback: z
          .string()
          .describe("Feedback for the user on how to improve the COUNTERPOINT"),
      }),
      prompt,
    });
  });

  return counterpointEvaluation;
};
