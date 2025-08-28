import { deterministicEdgeId } from './graphSync';

export const chooseEdgeType = (parentType?: string) =>
  parentType === 'statement' ? 'statement' : 'negation';

export const buildConnectionEdge = (
  nodes: any[],
  parentId: string,
  childId: string
) => {
  const parentType = nodes.find((n) => n.id === parentId)?.type;
  const edgeType = chooseEdgeType(parentType);
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

