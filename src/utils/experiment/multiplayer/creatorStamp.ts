import type { Edge, Node } from "@xyflow/react";

const hasCreator = (data?: Record<string, unknown> | null) => {
  if (!data) return false;
  const value = (data as any).createdBy;
  return value !== undefined && value !== null && value !== "";
};

export interface CreatorStampResult {
  nodes: Node[];
  edges: Edge[];
  changed: boolean;
  changedNodeIds: string[];
  changedEdgeIds: string[];
}

export const stampMissingCreator = (
  nodes: Node[],
  edges: Edge[],
  creatorId?: string | null,
  creatorName?: string | null
): CreatorStampResult => {
  if (!creatorId) {
    return {
      nodes,
      edges,
      changed: false,
      changedNodeIds: [],
      changedEdgeIds: [],
    };
  }

  const changedNodeIds: string[] = [];
  const changedEdgeIds: string[] = [];

  const stampedNodes = nodes.map((node) => {
    if ((node as any)?.type === "edge_anchor") return node;
    const data = (node as any)?.data || {};
    if (hasCreator(data)) return node;
    const next = {
      ...node,
      data: {
        ...data,
        createdBy: creatorId,
        createdByName:
          typeof (data as any).createdByName === "string"
            ? (data as any).createdByName
            : creatorName ?? null,
      },
    };
    changedNodeIds.push(node.id);
    return next;
  });

  const stampedEdges = edges.map((edge) => {
    const data = (edge as any)?.data || {};
    if (hasCreator(data)) return edge;
    const next = {
      ...edge,
      data: {
        ...data,
        createdBy: creatorId,
        createdByName:
          typeof (data as any).createdByName === "string"
            ? (data as any).createdByName
            : creatorName ?? null,
      },
    };
    changedEdgeIds.push(edge.id);
    return next;
  });

  return {
    nodes: stampedNodes,
    edges: stampedEdges,
    changed: changedNodeIds.length > 0 || changedEdgeIds.length > 0,
    changedNodeIds,
    changedEdgeIds,
  };
};
