"use server";

import {
  GOOD_ENOUGH_POINT_RATING,
  POINT_MAX_LENGTH,
  POINT_MIN_LENGTH,
} from "@/constants/config";
import { Point } from "@/db/tables/pointsTable";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { withRetry } from "@/lib/utils/withRetry";

export interface EvaluateObjectionArgs {
  negatedPointContent: Point["content"];
  contextPointContent: Point["content"];
  objectionContent: Point["content"];
}

export interface ReviewResults {
  rating: number;
  feedback: string;
  suggestions: {
    suggestion: string;
    reason: string;
  }[];
}

export const rateAndRefineObjectionAction = async ({
  negatedPointContent,
  contextPointContent,
  objectionContent,
}: EvaluateObjectionArgs) => {
  const prompt = `You are a helpful assistant that improves the phrasing of objections in a debate/discussion platform
Using this statement as the NEGATED POINT (the point that is being objected to):
${negatedPointContent}
---

And this statement as the CONTEXT POINT (the point that is being defended by the objection):
${contextPointContent}
---

And this statement as the OBJECTION:
${objectionContent}
---

Considering that the user is proposing the OBJECTION as a rebuttal of the NEGATED POINT, arguing that the NEGATED POINT is irrelevant to the CONTEXT POINT, evaluate whether the OBJECTION meets the criteria of a good objection:
- Is a declarative statement
- Expresses a single idea (claim)
- Makes sense on its own
- Is orthographically correct: starts with a capital letter, ends with a period.
- Is grammatically correct
- Is concise and articulate
- Is not vague or ambiguous
- Is easily understandable
- Is relevant to the relationship between the NEGATED POINT and the CONTEXT POINT
- Is not phrased as a personal opinion, using neutral tone instead
- Presents logical assertions rather than just disagreement
- Does not include opening remarks, going straight to the point
- Focus directly on the subject matter without unnecessary framing
- Its claim is about the irrelevance of the NEGATED POINT to the CONTEXT POINT

Some conditions that require immediate rejection and a score of 1:
- The user provided objection has improper punctuation and grammar, i.e. does not start with a capital letter or does not end with a period.

then, rate it from 1 to 10.
The rating should not take into account morality, ethics or the merit of the claim, but rather how well it meets the criteria above.

if it's rated below ${GOOD_ENOUGH_POINT_RATING}, provide feedback on how to improve it (It will be displayed in the UI below the OBJECTION).
- The feedback should focus on a single aspect that if improved would make the OBJECTION better according to the criteria above. It does not need to be comprehensive as there can be further iteration later.
- The feedback should start with "It could be improved by..." and be clear, concise, and actionable.
- The feedback should not be opinionated in regards to the claim of the OBJECTION, but rather focus on the clarity, conciseness, structure and relevance of the statement.

Also offer 3 rephrasings of the OBJECTION that would make it better according to the criteria above, along with a distinct reason for each why it's better.

- The rephrasings MUST EXPRESS THE SAME MAIN IDEA as the OBJECTION.
- The rephrasings MUST MEET ALL CRITERIA ABOVE, so that they would be rated 10.
- The rephrasings MUST STICK AS CLOSELY AS POSSIBLE to the original OBJECTION.
- The rephrasings must use modern and straightforward way.
- The rephrasings must avoid using fancy, outdated, or overly formal expressions.
- The rephrasings should not include opening remarks, going straight to the point.
- The rephrasings should contain between ${POINT_MIN_LENGTH} and ${POINT_MAX_LENGTH} characters.

Each reason should be concise and highlight a specific improvement over the original objection or other suggestions, making sure the reasons are distinct from each other.

Focus on being clear, concise, and easy to understand, as if you're explaining something to a friend in today's world in an accessible way.
Match the input language, do not translate to English.

`;

  const { object: objectionEvaluation } = await withRetry(async () => {
    return generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        rating: z
          .number()
          .min(1)
          .max(10)
          .int()
          .describe("rating of the objection"),
        suggestions: z
          .array(
            z.object({
              suggestion: z.string().describe("Suggested rephrasing"),
              reason: z
                .string()
                .describe("Reason why this suggestion is better"),
            })
          )
          .describe("Suggested rephrasings of the OBJECTION with reasons"),
        feedback: z
          .string()
          .describe("Feedback for the user on how to improve the OBJECTION"),
      }),
      prompt,
    });
  });

  return objectionEvaluation;
};
