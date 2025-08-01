"use server";

import { db } from "@/services/db";
import { rationalePointsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";

/**
 * Updates the rationale_points bridge table for a given rationale
 * Extracts point IDs from the viewpoint graph and maintains the mapping
 */
export async function updateRationalePoints(
  rationaleId: string,
  graph: ViewpointGraph
): Promise<void> {
  try {
    const pointIdSet = new Set<number>();

    if (graph?.nodes) {
      for (const node of graph.nodes) {
        if (node.type === "point" && node.data?.pointId) {
          const pointId = Number(node.data.pointId);
          if (!isNaN(pointId)) {
            pointIdSet.add(pointId);
          }
        }
      }
    }

    const pointIds = Array.from(pointIdSet);

    await db.transaction(async (tx) => {
      await tx
        .delete(rationalePointsTable)
        .where(eq(rationalePointsTable.rationaleId, rationaleId));

      if (pointIds.length > 0) {
        const values = pointIds.map((pointId) => ({
          rationaleId,
          pointId,
        }));

        await tx.insert(rationalePointsTable).values(values);
      }
    });

    console.log(
      `[updateRationalePoints] Updated ${pointIds.length} point mappings for rationale ${rationaleId}`
    );
  } catch (error) {
    console.error(
      "[updateRationalePoints] Failed to update rationale points for rationaleId:",
      rationaleId,
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    // Don't throw - we don't want to break rationale creation/update if this fails
  }
}
