import { PointWithDetails } from "@/db/views/pointsWithDetailsView";
import { favor } from "@/lib/negation-game/favor";

export const addFavor = <
  T extends Pick<PointWithDetails, "cred" | "negationsCred">,
>(
  points: T[]
) =>
  points.map((point) => ({
    ...point,
    favor: favor(point),
  }));
