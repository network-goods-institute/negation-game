"use server";

import { getSpace } from "@/actions/getSpace";
import { db } from "@/services/db";
import { pointsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export type PointInSpace = {
  id: number;
  content: string;
  createdBy: string;
};

/**
 * Fetches essential details (id, content, createdBy) for all points
 * within the current user's space.
 */
export const fetchAllSpacePoints = async (): Promise<PointInSpace[]> => {
  const space = await getSpace();

  if (!space) {
    console.warn(
      "[fetchAllSpacePoints] No space found. Returning empty array."
    );
    return [];
  }

  try {
    const points = await db
      .select({
        id: pointsTable.id,
        content: pointsTable.content,
        createdBy: pointsTable.createdBy,
      })
      .from(pointsTable)
      .where(eq(pointsTable.space, space));

    console.log(
      `[fetchAllSpacePoints] Fetched ${points.length} points for space: ${space}`
    );
    return points;
  } catch (error) {
    console.error(
      `[fetchAllSpacePoints] Error fetching points for space ${space}:`,
      error
    );
    return [];
  }
};
