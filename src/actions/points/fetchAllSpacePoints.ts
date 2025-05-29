"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { db } from "@/services/db";
import { pointsWithDetailsView } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface PointInSpace {
  pointId: number;
  content: string;
  createdBy: string;
  createdAt: Date;
  amountNegations: number;
  amountSupporters: number;
  cred: number;
}

/**
 * Fetches essential details (id, content, createdBy) for all points
 * within the current user's space.
 */
export const fetchAllSpacePoints = async (): Promise<PointInSpace[]> => {
  const space = await getSpace();

  if (!space) {
    return [];
  }

  try {
    const points = await db
      .select({
        pointId: pointsWithDetailsView.pointId,
        content: pointsWithDetailsView.content,
        createdBy: pointsWithDetailsView.createdBy,
        createdAt: pointsWithDetailsView.createdAt,
        amountNegations: pointsWithDetailsView.amountNegations,
        amountSupporters: pointsWithDetailsView.amountSupporters,
        cred: pointsWithDetailsView.cred,
      })
      .from(pointsWithDetailsView)
      .where(eq(pointsWithDetailsView.space, space));

    return points;
  } catch (error) {
    return [];
  }
};
