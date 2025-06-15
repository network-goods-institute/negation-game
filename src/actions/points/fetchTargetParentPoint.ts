"use server";

import { db } from "@/services/db";
import { negationsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const fetchTargetParentPoint = async (
  targetPointId: number
): Promise<number | null> => {
  try {
    // Find the negation where targetPointId is the newerPointId (it's negating something older)
    const result = await db
      .select({ olderPointId: negationsTable.olderPointId })
      .from(negationsTable)
      .where(
        and(
          eq(negationsTable.newerPointId, targetPointId),
          eq(negationsTable.isActive, true)
        )
      )
      .limit(1);

    return result.length > 0 ? result[0].olderPointId : null;
  } catch (error) {
    console.error("Error fetching target parent point:", error);
    return null;
  }
};
