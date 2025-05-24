"use server";

import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { viewpointInteractionsTable } from "@/db/tables/viewpointInteractionsTable";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";

export interface ShouldConfirmResult {
  shouldConfirm: boolean;
  viewCountSinceLastUpdate: number;
  lastUpdated: Date | null;
  daysSinceUpdate: number;
}

/**
 * Checks if a rationale update should be confirmed based on:
 * 1. If it hasn't been updated in 2+ days
 * 2. If it has been viewed 15+ times since last update
 */
export const shouldConfirmRationaleUpdate = async (
  rationaleId: string
): Promise<ShouldConfirmResult> => {
  try {
    const viewpointData = await db
      .select({
        lastUpdated: viewpointsTable.lastUpdatedAt,
        viewsAtLastUpdate: viewpointsTable.viewsAtLastUpdate,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.id, rationaleId))
      .limit(1);

    if (!viewpointData.length) {
      return {
        shouldConfirm: false,
        viewCountSinceLastUpdate: 0,
        lastUpdated: null,
        daysSinceUpdate: 0,
      };
    }

    const { lastUpdated, viewsAtLastUpdate } = viewpointData[0];

    const interactionData = await db
      .select({ currentViews: viewpointInteractionsTable.views })
      .from(viewpointInteractionsTable)
      .where(eq(viewpointInteractionsTable.viewpointId, rationaleId))
      .limit(1);

    const currentViews = interactionData[0]?.currentViews || 0;

    const viewCountSinceLastUpdate = Math.max(
      0,
      currentViews - (viewsAtLastUpdate || 0)
    );

    const now = new Date();
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    );

    const shouldConfirm =
      daysSinceUpdate >= 2 || viewCountSinceLastUpdate >= 15;

    return {
      shouldConfirm,
      viewCountSinceLastUpdate,
      lastUpdated,
      daysSinceUpdate,
    };
  } catch (error) {
    console.error("Error checking rationale update condition:", error);
    return {
      shouldConfirm: false,
      viewCountSinceLastUpdate: 0,
      lastUpdated: null,
      daysSinceUpdate: 0,
    };
  }
};
