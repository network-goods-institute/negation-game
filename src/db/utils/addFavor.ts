import { PointWithDetails } from "@/db/views/pointsWithDetailsView";
import { favor } from "@/lib/negation-game/favor";

export const addFavor = <
  T extends Pick<PointWithDetails, "cred" | "negationsCred"> & {
    restakesByPoint?: number;
    slashedAmount?: number;
    doubtedAmount?: number;
  },
>(
  points: T[],
) => {
  const pointsWithFavor = points.map((point) => {
    const favorInputs = {
      cred: point.cred,
      negationsCred: point.negationsCred,
      restakeAmount: point.restakesByPoint ?? 0,
      slashedAmount: point.slashedAmount ?? 0,
      doubtedAmount: point.doubtedAmount ?? 0,
    };
    return {
      ...point,
      favor: favor(favorInputs),
    };
  });
  return pointsWithFavor;
};
