"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { db } from "@/services/db";
import { pointsWithDetailsView, objectionsTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface PointInSpace {
  pointId: number;
  content: string;
  createdBy: string;
  createdAt: Date;
  amountNegations: number;
  amountSupporters: number;
  cred: number;
  isObjection: boolean;
  objectionTargetId: number | null;
  objectionContextId: number | null;
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
        isObjection:
          sql<boolean>`CASE WHEN ${objectionsTable.objectionPointId} IS NOT NULL THEN true ELSE false END`.mapWith(
            Boolean
          ),
        objectionTargetId: objectionsTable.targetPointId,
        objectionContextId: objectionsTable.contextPointId,
      })
      .from(pointsWithDetailsView)
      .leftJoin(
        objectionsTable,
        eq(objectionsTable.objectionPointId, pointsWithDetailsView.pointId)
      )
      .where(eq(pointsWithDetailsView.space, space));

    return points;
  } catch (error) {
    return [];
  }
};
