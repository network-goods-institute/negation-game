"use server";

import { db } from "@/services/db";
import { pointsTable } from "@/db/tables/pointsTable";
import { inArray, eq, and } from "drizzle-orm";

/**
 * Fetches points from the database that exactly match the provided content strings within a specific space.
 *
 * @param contentStrings - An array of content strings to search for.
 * @param spaceId - The ID of the space to search within.
 * @returns A promise that resolves to an array of points matching the content and space.
 */

export async function fetchPointsByExactContent(
  contentStrings: string[],
  spaceId: string
): Promise<{ id: number; content: string }[]> {
  if (!contentStrings || contentStrings.length === 0) {
    return [];
  }

  if (!spaceId) {
    return [];
  }

  try {
    const points = await db
      .select({
        id: pointsTable.id,
        content: pointsTable.content,
      })
      .from(pointsTable)
      .where(
        and(
          inArray(pointsTable.content, contentStrings),
          eq(pointsTable.space, spaceId)
        )
      );

    return points;
  } catch (error) {
    return [];
  }
}
