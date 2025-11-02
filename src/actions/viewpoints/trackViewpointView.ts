"use server";

import { db } from "@/services/db";
import { viewpointInteractionsTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";import { logger } from "@/lib/logger";

/**
 * Increment the view count for a viewpoint
 * This is called when a viewpoint is loaded
 */
export const trackViewpointView = async (viewpointId: string) => {
  try {
    // Try to update an existing record first
    const result = await db
      .update(viewpointInteractionsTable)
      .set({
        views: sql`${viewpointInteractionsTable.views} + 1`,
        lastViewed: new Date(),
      })
      .where(eq(viewpointInteractionsTable.viewpointId, viewpointId))
      .returning();

    if (result.length === 0) {
      await db.insert(viewpointInteractionsTable).values({
        viewpointId,
        views: 1,
        copies: 0,
        lastViewed: new Date(),
        lastUpdated: new Date(),
      });
    }

    // Return success
    return true;
  } catch (error) {
    logger.error("Error tracking viewpoint view:", error);
    // Don't throw - fail silently
    return false;
  }
};
