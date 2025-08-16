import { atom } from "jotai";

export interface AffectedEdge {
  edgeId: string;
  pointId: number;
  relatedPointId: number;
  type: "negation" | "endorsement" | "restake" | "doubt";
  affectedAt: number; // timestamp
}

export const affectedEdgesAtom = atom<AffectedEdge[]>([]);

export const addAffectedEdgeAtom = atom(
  null,
  (get, set, affectedEdge: AffectedEdge) => {
    const currentEdges = get(affectedEdgesAtom);

    const filteredEdges = currentEdges.filter(
      (edge) => edge.edgeId !== affectedEdge.edgeId
    );

    set(affectedEdgesAtom, [...filteredEdges, affectedEdge]);

    setTimeout(() => {
      set(affectedEdgesAtom, (edges) =>
        edges.filter((edge) => edge.edgeId !== affectedEdge.edgeId)
      );
    }, 5000);
  }
);

export const clearAffectedEdgesAtom = atom(null, (get, set) => {
  set(affectedEdgesAtom, []);
});

export const isEdgeAffectedAtom = atom((get) => (edgeId: string) => {
  const affectedEdges = get(affectedEdgesAtom);
  return affectedEdges.some((edge) => edge.edgeId === edgeId);
});
