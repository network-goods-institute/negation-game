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

  // Check direct connections
  for (const e of edges) {
    const src = e.source as string;
    const tgt = e.target as string;
    if ((src === hoveredNodeId && tgt === candidateId) || (src === candidateId && tgt === hoveredNodeId)) return true;
  }

  // Check objection relationships
  // If candidate is an objection, check if it's connected to an edge involving hovered node
  const objectionEdge = edges.find(e => e.type === 'objection' && e.source === candidateId);
  if (objectionEdge) {
    const anchorId = objectionEdge.target;
    // Find edges where this anchor is on an edge between hovered node and something else
    for (const e of edges) {
      if (e.type !== 'objection' && (e.source === hoveredNodeId || e.target === hoveredNodeId)) {
        // Check if this edge has an anchor that the objection connects to
        const edgeId = e.id;
        if (anchorId === `anchor:${edgeId}`) {
          return true;
        }
      }
    }
  }

  // If hovered node has edges with objections, check if candidate is one of those objections
  for (const e of edges) {
    if (e.type !== 'objection' && (e.source === hoveredNodeId || e.target === hoveredNodeId)) {
      const edgeId = e.id;
      const anchorId = `anchor:${edgeId}`;
      // Find objection connected to this anchor
      const objection = edges.find(oe => oe.type === 'objection' && oe.target === anchorId);
      if (objection && objection.source === candidateId) {
        return true;
      }
    }
  }

  // REVERSE: If hovered node is an objection, check if candidate is connected to the edge it objects to
  const hoveredObjectionEdge = edges.find(e => e.type === 'objection' && e.source === hoveredNodeId);
  if (hoveredObjectionEdge) {
    const anchorId = hoveredObjectionEdge.target;
    // Find the edge this objection is connected to
    for (const e of edges) {
      if (e.type !== 'objection' && e.id && anchorId === `anchor:${e.id}`) {
        // Check if candidate is either source or target of this edge
        if (e.source === candidateId || e.target === candidateId) {
          return true;
        }
      }
    }
  }

  return false;
};
