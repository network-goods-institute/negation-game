"use server";

import { fetchPointSnapshots } from "@/actions/points/fetchPointSnapshots";

export const validatePointsExistence = async (
  pointIds: number[]
): Promise<Set<number>> => {
  if (pointIds.length === 0) {
    return new Set();
  }

  const snapshots = await fetchPointSnapshots(pointIds);

  return new Set(snapshots.map((point) => point.id));
};
