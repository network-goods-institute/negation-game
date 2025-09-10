"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { AppNode } from "@/components/graph/nodes/AppNode";
import { InsertViewpoint, viewpointsTable } from "@/db/tables/viewpointsTable";
import { queueRationaleMentionNotification } from "@/lib/notifications/notificationQueue";
import { canUserCreateRationaleForTopic } from "@/actions/topics/manageTopicPermissions";
import { updateRationalePoints } from "@/actions/viewpoints/updateRationalePoints";
import { db } from "@/services/db";
import { nanoid } from "nanoid";
import { pick } from "remeda";
import { topicsTable } from "@/db/tables/topicsTable";
import { eq } from "drizzle-orm";
import { validatePointsExistence } from "@/actions/points/validatePointsExistence";

export interface PublishViewpointArgs
  extends Omit<
    InsertViewpoint,
    "id" | "space" | "createdBy" | "graph" | "copiedFromId" | "title"
  > {
  graph: ViewpointGraph;
  copiedFromId?: string;
  topicId?: number | null;
  title?: string;
}

export const publishViewpoint = async ({
  description,
  graph,
  title,
  topicId,
  copiedFromId,
}: PublishViewpointArgs) => {
  const [userId, space] = await Promise.all([getUserId(), getSpace()]);

  if (!userId) {
    throw new Error("Must be authenticated to publish a rationale");
  }

  let enforcedTopicId = topicId;

  const tasks: Promise<any>[] = [];

  if (enforcedTopicId) {
    tasks.push(canUserCreateRationaleForTopic(userId, enforcedTopicId));
    tasks.push(
      db
        .select({ name: topicsTable.name })
        .from(topicsTable)
        .where(eq(topicsTable.id, enforcedTopicId))
        .limit(1)
    );
  }

  const results = tasks.length > 0 ? await Promise.all(tasks) : [];

  if (enforcedTopicId) {
    const canCreate = results[0];
    if (!canCreate) {
      throw new Error(
        "You do not have permission to create rationales for this topic"
      );
    }
  }

  let finalTitle = title;
  if (enforcedTopicId && results[1] && results[1][0]) {
    finalTitle = results[1][0].name;
  }

  if (!finalTitle) {
    finalTitle = "Untitled";
  }

  const id = nanoid();

  const pointIds = graph.nodes
    .filter(
      (node) =>
        node.type === "point" &&
        node.data &&
        typeof node.data === "object" &&
        "pointId" in node.data &&
        typeof node.data.pointId === "number"
    )
    .map((node) => (node.data as any).pointId as number);

  if (pointIds.length > 0) {
    const existingPointIds = await validatePointsExistence(pointIds);
    const deletedPointIds = pointIds.filter((id) => !existingPointIds.has(id));

    if (deletedPointIds.length > 0) {
      throw new Error(
        `Cannot publish rationale: ${deletedPointIds.length} point${deletedPointIds.length === 1 ? "" : "s"} no longer exist${deletedPointIds.length === 1 ? "s" : ""}. Please remove any empty or deleted nodes from your rationale and try again.`
      );
    }
  }

  const cleanedGraph = cleanupForPublishing(graph);

  const valuesToInsert = {
    id,
    createdBy: userId,
    description,
    topicId: enforcedTopicId ?? null,
    graph: cleanedGraph,
    title: finalTitle,
    space,
    copiedFromId,
  };
  await db.insert(viewpointsTable).values(valuesToInsert);

  // Update rationale_points bridge table
  await updateRationalePoints(id, cleanedGraph);

  // Queue notification for mentioned points - let the queue handle all the parsing and logic
  queueRationaleMentionNotification({
    rationaleId: id,
    graph,
    authorId: userId,
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
