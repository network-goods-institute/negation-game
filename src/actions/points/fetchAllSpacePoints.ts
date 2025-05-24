"use server";

import { getSpace } from "@/actions/spaces/getSpace";
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

    return points;
  } catch (error) {
    return [];
  }
};
