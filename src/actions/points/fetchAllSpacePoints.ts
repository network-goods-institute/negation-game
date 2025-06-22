"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { db } from "@/services/db";
import { pointsWithDetailsView, objectionsTable } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { headers } from "next/headers";
import { SPACE_HEADER } from "@/constants/config";

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
  let space: string | null = null;

  try {
    space = await getSpace();
  } catch {
    /* Middleware didn't set header, fallthrough */
  }

  if (!space) {
    space = (await headers()).get(SPACE_HEADER) ?? "global";
  }

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
        and(
          eq(objectionsTable.objectionPointId, pointsWithDetailsView.pointId),
          eq(objectionsTable.isActive, true)
        )
      )
      .where(eq(pointsWithDetailsView.space, space));

    return points;
  } catch (error) {
    return [];
  }
};
