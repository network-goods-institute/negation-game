"use server";

import { GOOD_ENOUGH_POINT_RATING } from "@/constants/config";
import { Point } from "@/db/tables/pointsTable";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { withRetry } from "@/lib/utils/withRetry";
import { fetchSimilarPoints } from "@/actions/points/fetchSimilarPoints";

export interface ReviewProposedPointArgs {
  pointContent: Point["content"];
  parentContent?: Point["content"]; // For options/statement children
}

const reviewSchema = z.object({
  rating: z.number().min(1).max(10),
  suggestions: z.array(z.string()).max(3),
  feedback: z.string(),
});

export type PointReviewResults = {
  rating: number;
  suggestions: string[];
  feedback: string;
  existingSimilarPoints: Awaited<ReturnType<typeof fetchSimilarPoints>>;
};

export const reviewProposedPointAction = async ({
  pointContent,
  parentContent,
}: ReviewProposedPointArgs): Promise<PointReviewResults> => {
  const isOption = !!parentContent;

  const prompt = isOption
    ? `You are a helpful assistant that evaluates and improves option statements in a debate/discussion platform.

The user is proposing this OPTION for the statement:
"${parentContent}"

PROPOSED OPTION:
${pointContent}
---

Evaluate whether this OPTION meets the criteria of a good option:
- Is a declarative statement
- Expresses a single idea or policy position
- Makes sense as a response/option for the parent statement
- Is orthographically correct: starts with a capital letter, ends with a period
- Is grammatically correct
- Is concise and articulate
- Is not vague or ambiguous
- Is easily understandable
- Provides a clear actionable position or viewpoint

Rate the option from 1-10 (where ${GOOD_ENOUGH_POINT_RATING}+ is considered good enough to submit).
Provide 2-3 improved versions if the rating is below ${GOOD_ENOUGH_POINT_RATING}.
Include brief feedback explaining the rating.`
    : `You are a helpful assistant that evaluates and improves point statements in a debate/discussion platform.

PROPOSED POINT:
${pointContent}
---

Evaluate whether this POINT meets the criteria of a good point:
- Is a declarative statement
- Expresses a single idea (claim)
- Makes sense on its own
- Is orthographically correct: starts with a capital letter, ends with a period
- Is grammatically correct
- Is concise and articulate
- Is not vague or ambiguous
- Is easily understandable

Rate the point from 1-10 (where ${GOOD_ENOUGH_POINT_RATING}+ is considered good enough to submit).
Provide 2-3 improved versions if the rating is below ${GOOD_ENOUGH_POINT_RATING}.
Include brief feedback explaining the rating.`;

  const reviewTask = withRetry(async () => {
    return await generateObject({
      model: openai("gpt-4o-mini"),
      prompt,
      schema: reviewSchema,
      temperature: 0.3,
    });
  });

  const similarPointsTask = fetchSimilarPoints({ query: pointContent });

  const [reviewResult, existingSimilarPoints] = await Promise.all([
    reviewTask,
    similarPointsTask,
  ]);

  return {
    rating: reviewResult.object.rating,
    suggestions: reviewResult.object.suggestions,
    feedback: reviewResult.object.feedback,
    existingSimilarPoints,
  };
};
