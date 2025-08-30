export const edgeIsObjectionStyle = (targetNodeType?: string | null) => {
  return targetNodeType === "edge_anchor";
};

export type SimpleEdge = {
  id: string;
  type?: string;
  source: string;
  target: string;
};

export const nodeIsPointLikeByIncomingNegation = (
  nodeId: string,
  edges: SimpleEdge[]
) => {
  return edges.some(
    (e) => (e.type || "") === "negation" && e.target === nodeId
  );
};
