import type { Edge, Node } from "@xyflow/react";

export interface EdgeNotificationCandidate {
  edgeId: string;
  targetNodeId: string;
  type: "support" | "negation" | "objection";
  recipientUserId: string;
  recipientUsername?: string | null;
  title: string;
}

interface BuildEdgeNotificationOptions {
  requireCreatorMatch?: boolean;
}

const edgeTypesToNotify: Record<string, EdgeNotificationCandidate["type"]> = {
  support: "support",
  negation: "negation",
  objection: "objection",
};

const extractTitle = (node: Node) => {
  const data = (node as any)?.data || {};
  const content = data.content ?? data.statement;
  if (typeof content === "string" && content.trim().length > 0) {
    return content.trim();
  }
  return "Untitled point";
};

export const buildEdgeNotificationCandidates = (
  edges: Edge[],
  nodes: Node[],
  actorUserId?: string | null,
  fallbackRecipientId?: string | null,
  options?: BuildEdgeNotificationOptions
): EdgeNotificationCandidate[] => {
  if (!actorUserId) return [];
  if (!Array.isArray(edges) || !Array.isArray(nodes)) return [];
  const requireCreatorMatch = options?.requireCreatorMatch ?? true;

  const nodesById = new Map<string, Node>();
  nodes.forEach((node) => nodesById.set(node.id, node));

  const candidates: EdgeNotificationCandidate[] = [];

  for (const edge of edges) {
    const type = edgeTypesToNotify[String((edge as any).type)] || null;
    if (!type) continue;

    const data = (edge as any)?.data || {};
    if (requireCreatorMatch && data.createdBy !== actorUserId) continue;

    const targetId = (edge as any)?.target as string | undefined;
    if (!targetId) continue;
    const targetNode = nodesById.get(targetId);
    if (!targetNode) continue;
    if (String(targetNode.type) === "edge_anchor") continue;

    const targetData = (targetNode as any)?.data || {};
    const rawRecipient = targetData.createdBy || fallbackRecipientId || null;
    const recipientId =
      typeof rawRecipient === "string" && rawRecipient.trim().length > 0
        ? rawRecipient
        : null;
    if (!recipientId || recipientId === actorUserId) continue;

    candidates.push({
      edgeId: edge.id,
      targetNodeId: targetId,
      type,
      recipientUserId: recipientId,
      recipientUsername:
        typeof targetData.createdByName === "string"
          ? targetData.createdByName
          : undefined,
      title: extractTitle(targetNode),
    });
  }

  return candidates;
};
