"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { AppNode } from "@/components/graph/AppNode";
import { InsertViewpoint, viewpointsTable } from "@/db/tables/viewpointsTable";
import { db } from "@/services/db";
import { nanoid } from "nanoid";
import { pick } from "remeda";

export interface PublishViewpointArgs
  extends Omit<InsertViewpoint, "id" | "space" | "createdBy" | "graph"> {
  graph: ViewpointGraph;
}

export const publishViewpoint = async ({
  description,
  graph,
  title,
}: PublishViewpointArgs) => {
  const userId = await getUserId();
  const space = await getSpace();

  if (!userId) {
    throw new Error("Must be authenticated to publish a rationale");
  }

  const id = nanoid();

  await db.insert(viewpointsTable).values({
    id,
    createdBy: userId,
    description,
    graph: cleanupForPublishing(graph),
    title,
    space,
  });

  return id;
};

const cleanupForPublishing = (graph: ViewpointGraph) => {
  const { nodes, edges } = graph;

  return {
    nodes: nodes.map(
      (node) => pick(node, ["id", "position", "type", "data"]) as AppNode
    ),
    edges,
  };
};
