import type { Edge } from '@xyflow/react';

export const isNegatedTargetOfHovered = (
  hoveredNodeId: string,
  candidateTargetId: string,
  edges: Edge[]
) => {
  if (!hoveredNodeId || !candidateTargetId || hoveredNodeId === candidateTargetId) return false;
  for (const e of edges) {
    if (e.type === 'negation' && e.source === hoveredNodeId && e.target === candidateTargetId) return true;
  }
  return false;
};

export const isDirectNeighbor = (
  hoveredNodeId: string,
  candidateId: string,
  edges: Edge[]
) => {
  if (!hoveredNodeId || !candidateId || hoveredNodeId === candidateId) return false;
  for (const e of edges) {
    const src = e.source as string;
    const tgt = e.target as string;
    if ((src === hoveredNodeId && tgt === candidateId) || (src === candidateId && tgt === hoveredNodeId)) return true;
  }
  return false;
};
