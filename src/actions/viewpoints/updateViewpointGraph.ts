"use server";

import { getUserId } from "@/actions/users/getUserId";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";
import { AppNode } from "@/components/graph/nodes/AppNode";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { pick } from "remeda";
import { viewpointInteractionsTable } from "@/db/tables/viewpointInteractionsTable";

export interface UpdateViewpointGraphArgs {
  id: string;
  graph: ViewpointGraph;
}

const cleanupForPublishing = (graph: ViewpointGraph) => {
  const { nodes, edges } = graph;
  return {
    nodes: nodes.map(
      (node) => pick(node, ["id", "position", "type", "data"]) as AppNode
    ),
    edges,
  };
};

export const updateViewpointGraph = async ({
  id,
  graph,
}: UpdateViewpointGraphArgs) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to update rationale");
  }

  // Check if user is the owner of this viewpoint
  const viewpointOwnerCheck = await db
    .select({ createdBy: viewpointsTable.createdBy })
    .from(viewpointsTable)
    .where(eq(viewpointsTable.id, id))
    .then((rows) => rows[0]);

  if (!viewpointOwnerCheck || viewpointOwnerCheck.createdBy !== userId) {
    throw new Error("Only the owner can update this rationale");
  }

  const cleanedGraph = cleanupForPublishing(graph);

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
        graph: cleanedGraph,
        lastUpdatedAt: new Date(),
        viewsAtLastUpdate: currentViewCount,
      })
      .where(eq(viewpointsTable.id, id));

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
