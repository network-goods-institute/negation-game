"use server";

import { getUserId } from "@/actions/getUserId";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";
import { AppNode } from "@/components/graph/AppNode";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { pick } from "remeda";

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
  const viewpoint = await db
    .select({ createdBy: viewpointsTable.createdBy })
    .from(viewpointsTable)
    .where(eq(viewpointsTable.id, id))
    .then((rows) => rows[0]);

  if (!viewpoint || viewpoint.createdBy !== userId) {
    throw new Error("Only the owner can update this rationale");
  }

  const cleanedGraph = cleanupForPublishing(graph);

  try {
    await db
      .update(viewpointsTable)
      .set({
        graph: cleanedGraph,
      })
      .where(eq(viewpointsTable.id, id));
    return id;
  } catch (error) {
    throw error;
  }
};
