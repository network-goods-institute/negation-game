import { deterministicEdgeId } from "./graphSync";

export const chooseEdgeType = (
  sourceType?: string,
  targetType?: string,
  preferredEdgeType?: "support" | "negation"
) => {
  // Any connection involving a title uses option
  if (sourceType === "title" || targetType === "title") {
    return "option";
  }

  // All edges TO a statement (question) use option
  if (targetType === "statement") {
    return "option";
  }

  // For point-to-point connections, use the preferred type (support or negation)
  // If no preference is provided, default to negation
  return preferredEdgeType || "negation";
};

export const buildConnectionEdge = (
  nodes: any[],
  parentId: string,
  childId: string,
  preferredEdgeType?: "support" | "negation"
) => {
  const parentType = nodes.find((n) => n.id === parentId)?.type;
  const childType = nodes.find((n) => n.id === childId)?.type;
  const edgeType = chooseEdgeType(childType, parentType, preferredEdgeType);
  const id = deterministicEdgeId(
    edgeType,
    childId,
    parentId,
    `${childId}-source-handle`,
    `${parentId}-incoming-handle`
  );
  const edge = {
    id,
    type: edgeType,
    source: childId,
    target: parentId,
    sourceHandle: `${childId}-source-handle`,
    targetHandle: `${parentId}-incoming-handle`,
    data: { relevance: 3 },
  } as const;
  return { id, edge, edgeType };
};
