"use server";

import { findObjectionCandidatesAction } from "@/actions/ai/findObjectionCandidatesAction";
import { rateAndRefineObjectionAction } from "@/actions/ai/rateAndRefineObjectionAction";
import { Point } from "@/db/tables/pointsTable";

export interface ReviewProposedObjectionArgs {
  targetPointId: Point["id"];
  negatedPointContent: Point["content"];
  objectionContent: Point["content"];
  contextPointId: Point["id"];
  contextPointContent: Point["content"];
}

export const reviewProposedObjectionAction = async ({
  targetPointId,
  negatedPointContent,
  objectionContent,
  contextPointId,
  contextPointContent,
}: ReviewProposedObjectionArgs) => {
  const existingSimilarObjections = await findObjectionCandidatesAction({
    objectionContent,
    targetPointId,
    negatedPointContent,
    contextPointId,
    contextPointContent,
  });

  const ratingAndRephrasings = await rateAndRefineObjectionAction({
    objectionContent,
    negatedPointContent,
    contextPointContent,
  });

  return {
    existingSimilarCounterpoints: existingSimilarObjections,
    ...ratingAndRephrasings,
  };
};
