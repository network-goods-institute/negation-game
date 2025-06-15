"use server";

import { db } from "@/services/db";
import { pointsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Server action to validate if a point exists in the database
 * This can be called from client components as needed
 */
export async function validatePointExists(pointId: number): Promise<boolean> {
  try {
    if (!pointId || pointId <= 0) return false;

    const exists = await db
      .select({ id: pointsTable.id })
      .from(pointsTable)
      .where(and(eq(pointsTable.id, pointId), eq(pointsTable.isActive, true)))
      .limit(1);

    return exists.length > 0;
  } catch (error) {
    console.error("Error validating point existence:", error);
    return false;
  }
}
