import { deterministicEdgeId } from "./graphSync";

export const chooseEdgeType = (
  sourceType?: string,
  targetType?: string,
  preferredEdgeType?: "support" | "negation"
) => {
  // Comment edges take priority over all other rules
  if (sourceType === "comment" || targetType === "comment") {
    return "comment";
  }

  // All edges involving a statement (question) use option
  if (sourceType === "statement" || targetType === "statement") {
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
    data: {},
  } as const;
  return { id, edge, edgeType };
};
