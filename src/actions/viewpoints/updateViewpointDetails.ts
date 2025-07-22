"use server";

import { getUserId } from "@/actions/users/getUserId";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { updateRationalePoints } from "@/actions/viewpoints/updateRationalePoints";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";
import { viewpointInteractionsTable } from "@/db/tables/viewpointInteractionsTable";

export interface UpdateViewpointDetailsArgs {
  id: string;
  title: string;
  description: string;
  topicId?: number;
}

export const updateViewpointDetails = async ({
  id,
  title,
  description,
  topicId,
}: UpdateViewpointDetailsArgs) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to update rationale");
  }

  const viewpoint = await db
    .select({
      createdBy: viewpointsTable.createdBy,
      graph: viewpointsTable.graph,
    })
    .from(viewpointsTable)
    .where(eq(viewpointsTable.id, id))
    .limit(1)
    .then((rows) => rows[0]);

  const isOwnerMatch = viewpoint?.createdBy === userId;

  if (!viewpoint || !isOwnerMatch) {
    throw new Error("Only the owner can update this rationale");
  }

  try {
    const currentInteractions = await db
      .select({ views: viewpointInteractionsTable.views })
      .from(viewpointInteractionsTable)
      .where(eq(viewpointInteractionsTable.viewpointId, id))
      .limit(1);

    const currentViewCount = currentInteractions[0]?.views || 0;

    await db
      .update(viewpointsTable)
      .set({
        title,
        description,
        ...(topicId !== undefined && { topicId }),
        lastUpdatedAt: new Date(),
        viewsAtLastUpdate: currentViewCount,
      })
      .where(eq(viewpointsTable.id, id));

    if (topicId !== undefined && viewpoint.graph) {
      await updateRationalePoints(id, viewpoint.graph as any);
    }

    await db
      .update(viewpointInteractionsTable)
      .set({
        lastUpdated: new Date(),
      })
      .where(eq(viewpointInteractionsTable.viewpointId, id))
      .catch((interactionError) => {
        console.error(
          "Error updating viewpoint interactions:",
          interactionError
        );
      });

    return id;
  } catch (error) {
    throw error;
  }
};
