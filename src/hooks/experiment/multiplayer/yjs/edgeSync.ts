import type { MutableRefObject } from "react";
import * as Y from "yjs";
import { Edge } from "@xyflow/react";

const toComparableEdge = (edge: Edge) => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  type: edge.type,
  sourceHandle: edge.sourceHandle,
  targetHandle: edge.targetHandle,
  data: edge.data ?? {},
});

export const createUpdateEdgesFromY = (
  yEdges: Y.Map<Edge>,
  lastEdgesSigRef: MutableRefObject<string>,
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void,
  localOriginRef?: MutableRefObject<unknown>,
  isUndoRedoRef?: MutableRefObject<boolean>
) => {
  return (_event: Y.YMapEvent<Edge>, transaction: Y.Transaction) => {
    const isLocalOrigin =
      localOriginRef && transaction.origin === localOriginRef.current;

    const edges = Array.from(yEdges.values());
    const migrations: Edge[] = [];

    const normalised = edges.map((edge) => {
      if (edge.type === "question") {
        const migrated: Edge = { ...edge, type: "option" };
        migrations.push(migrated);
        return migrated;
      }
      return edge;
    });

    if (migrations.length > 0) {
      try {
        const doc = yEdges.doc;
        if (doc) {
          doc.transact(() => {
            migrations.forEach((edge) => yEdges.set(edge.id, edge));
          }, localOriginRef?.current ?? "migration:edges");
        } else {
          migrations.forEach((edge) => yEdges.set(edge.id, edge));
        }
      } catch {}
    }

    // Sort edges to control z-index: objection edges render first (below), then other edges
    const sorted = [...normalised].sort((a, b) => {
      const aIsObjection = a.type === "objection";
      const bIsObjection = b.type === "objection";

      // Objection edges go first (render below)
      if (aIsObjection && !bIsObjection) return -1;
      if (!aIsObjection && bIsObjection) return 1;

      // Within same type, sort by ID for stability
      return (a.id || "").localeCompare(b.id || "");
    });
    const signature = JSON.stringify(sorted.map(toComparableEdge));
    if (signature === lastEdgesSigRef.current) {
      if (isLocalOrigin && !isUndoRedoRef?.current) {
        return;
      }
    }

    lastEdgesSigRef.current = signature;

    if (isLocalOrigin && !isUndoRedoRef?.current) {
      return;
    }

    setEdges(() => sorted);
  };
};
