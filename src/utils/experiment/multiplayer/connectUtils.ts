import { deterministicEdgeId } from "./graphSync";

export const chooseEdgeType = (sourceType?: string, targetType?: string) => {
  if (sourceType === "title" || targetType === "title") {
    return "option";
  }

  // Point connections TO a statement node use option edge (for options/positions)
  if (targetType === "statement" && sourceType === "point") {
    return "option";
  }

  // Objection connections TO a statement node use statement edge
  if (targetType === "statement") {
    return "statement";
  }

  // Edge-to-edge connections use objection edge (handled separately)
  // All other cases use negation edge
  return "negation";
};

export const buildConnectionEdge = (
  nodes: any[],
  parentId: string,
  childId: string,
  preferredEdgeType?: "support" | "negation"
) => {
  const parentType = nodes.find((n) => n.id === parentId)?.type;
  const childType = nodes.find((n) => n.id === childId)?.type;
  const computed = chooseEdgeType(childType, parentType);
  const edgeType =
    computed === "negation" && preferredEdgeType ? preferredEdgeType : computed;
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
