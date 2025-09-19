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
  localOriginRef?: MutableRefObject<unknown>
) => {
  return (_event: Y.YMapEvent<Edge>, transaction: Y.Transaction) => {
    if (localOriginRef && transaction.origin === localOriginRef.current) {
      return;
    }

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

    const sorted = [...normalised].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    const signature = JSON.stringify(sorted.map(toComparableEdge));
    if (signature === lastEdgesSigRef.current) {
      return;
    }

    lastEdgesSigRef.current = signature;
    setEdges(() => sorted);
  };
};


