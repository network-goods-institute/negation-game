import { deterministicEdgeId } from "./graphSync";

export const chooseEdgeType = (sourceType?: string, targetType?: string) => {
  if (sourceType === "title" || targetType === "title") {
    return "option";
  }

  // Any connection TO a statement node uses statement edge
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
  childId: string
) => {
  const parentType = nodes.find((n) => n.id === parentId)?.type;
  const childType = nodes.find((n) => n.id === childId)?.type;
  const edgeType = chooseEdgeType(childType, parentType);
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
