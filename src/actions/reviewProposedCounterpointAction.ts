"use server";

import { findCounterpointCandidatesAction } from "@/actions/findCounterpointCandidatesAction";
import { rateAndRefineCounterpointAction as rateAndRephraseCounterpointAction } from "@/actions/rateAndRephraseCounterpointAction";
import { Point } from "@/db/tables/pointsTable";

export interface ReviewProposedCounterpointArgs {
  negatedPointId: Point["id"];
  negatedPointContent: Point["content"];
  counterpointContent: Point["content"];
}

export const reviewProposedCounterpointAction = async ({
  negatedPointId,
  negatedPointContent,
  counterpointContent,
}: ReviewProposedCounterpointArgs) => {
  const existingSimilarCounterpoints = findCounterpointCandidatesAction({
    counterpointContent,
    negatedPointContent,
    negatedPointId,
  });

  const ratingAndRephrasings = rateAndRephraseCounterpointAction({
    counterpointContent,
    negatedPointContent,
  });

  return await Promise.all([
    existingSimilarCounterpoints,
    ratingAndRephrasings,
  ]).then(([existingSimilarCounterpoints, ratingAndRephrasings]) => ({
    existingSimilarCounterpoints,
    ...ratingAndRephrasings,
  }));
};
