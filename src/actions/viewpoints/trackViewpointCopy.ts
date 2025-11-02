"use server";

import { db } from "@/services/db";
import { viewpointInteractionsTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";import { logger } from "@/lib/logger";

/**
 * Increment the copy count for a viewpoint
 * This is called when a user creates a copy of a viewpoint
 */
export const trackViewpointCopy = async (viewpointId: string) => {
  try {
    // Try to update an existing record first
    const result = await db
      .update(viewpointInteractionsTable)
      .set({
        copies: sql`${viewpointInteractionsTable.copies} + 1`,
        lastUpdated: new Date(),
      })
      .where(eq(viewpointInteractionsTable.viewpointId, viewpointId))
      .returning();

    // If no record exists, create a new one
    if (result.length === 0) {
      await db.insert(viewpointInteractionsTable).values({
        viewpointId,
        views: 0,
        copies: 1,
        lastViewed: new Date(),
        lastUpdated: new Date(),
      });
    }

    // Return success
    return true;
  } catch (error) {
    logger.error("Error tracking viewpoint copy:", error);

    return false;
  }
};
