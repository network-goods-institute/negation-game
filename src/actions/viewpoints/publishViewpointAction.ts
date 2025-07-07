"use server";

import { getSpace } from "@/actions/spaces/getSpace";
import { getUserId } from "@/actions/users/getUserId";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { AppNode } from "@/components/graph/nodes/AppNode";
import { InsertViewpoint, viewpointsTable } from "@/db/tables/viewpointsTable";
import { queueRationaleMentionNotification } from "@/lib/notifications/notificationQueue";
import { canUserCreateRationaleForTopic } from "@/actions/topics/manageTopicPermissions";
import { db } from "@/services/db";
import { nanoid } from "nanoid";
import { pick } from "remeda";
import { topicsTable } from "@/db/tables/topicsTable";
import { eq } from "drizzle-orm";

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
  const userId = await getUserId();
  const space = await getSpace();

  if (!userId) {
    throw new Error("Must be authenticated to publish a rationale");
  }

  if (topicId) {
    const canCreate = await canUserCreateRationaleForTopic(userId, topicId);
    if (!canCreate) {
      throw new Error(
        "You do not have permission to create rationales for this topic"
      );
    }
  }
  let finalTitle = title;

  if (topicId) {
    const topicRow = await db
      .select({ name: topicsTable.name })
      .from(topicsTable)
      .where(eq(topicsTable.id, topicId))
      .limit(1);

    if (topicRow[0]) {
      finalTitle = topicRow[0].name;
    }
  }

  if (!finalTitle) {
    finalTitle = "Untitled";
  }

  const id = nanoid();

  const valuesToInsert = {
    id,
    createdBy: userId,
    description,
    topicId: topicId ?? null,
    graph: cleanupForPublishing(graph),
    title: finalTitle,
    space,
    copiedFromId,
  };
  await db.insert(viewpointsTable).values(valuesToInsert);

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
