import * as Y from "yjs";
import { toast } from "sonner";

import { generateEdgeId } from "../graphSync";

export const createAddObjectionForEdge = (
  nodes: any[],
  edges: any[],
  yNodesMap: any,
  yEdgesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  setEdges: (updater: (edges: any[]) => any[]) => void,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null
) => {
  return (edgeId: string, overrideMidX?: number, overrideMidY?: number) => {
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    const base = edges.find((e: any) => e.id === edgeId);
    if (!base) return;

    const src = nodes.find((n: any) => n.id === base.source);
    const tgt = nodes.find((n: any) => n.id === base.target);
    if (!src || !tgt) return;
    // Edge operations are never blocked by node locks
    const midX = overrideMidX ?? (src.position.x + tgt.position.x) / 2;
    const midY = overrideMidY ?? (src.position.y + tgt.position.y) / 2;

    const anchorId = `anchor:${edgeId}`;
    const objectionId = `o-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const anchorNode: any = {
      id: anchorId,
      type: "edge_anchor",
      position: { x: midX, y: midY },
      data: { parentEdgeId: edgeId },
    };
    const objectionNode: any = {
      id: objectionId,
      type: "objection",
      position: { x: midX, y: midY + 60 },
      data: {
        content: "New mitigation",
        parentEdgeId: edgeId,
        createdAt: Date.now(),
        favor: 5,
      },
      selected: true, // Auto-select newly created objection nodes
    };

    const objectionEdge: any = {
      id: generateEdgeId(),
      type: "objection",
      source: objectionId,
      target: anchorId,
    };
    // Always update local state immediately for responsiveness
    // Batch updates but avoid recursive setState chains
    setNodes((nds) => {
      const existsAnchor = nds.some((n: any) => n.id === anchorId);
      const newNodes = existsAnchor
        ? [...nds, objectionNode]
        : [...nds, anchorNode, objectionNode];
      return newNodes;
    });
    setEdges((eds) => {
      const newEdges = [...eds, objectionEdge];
      return newEdges;
    });

    // Also sync to Yjs if available
    if (yNodesMap && yEdgesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        if (!yNodesMap.has(anchorId)) yNodesMap.set(anchorId, anchorNode);
        yNodesMap.set(objectionId, objectionNode);
        if (!yEdgesMap.has(objectionEdge.id))
          yEdgesMap.set(objectionEdge.id, objectionEdge);
        // Create and register Y.Text for the new objection node immediately
        if (yTextMap && !yTextMap.get(objectionId)) {
          const t = new Y.Text();
          t.insert(0, "New mitigation");
          yTextMap.set(objectionId, t);
        }
      }, localOrigin);
    }
  };
};

export const createUpdateEdgeType = (
  nodes: any[],
  edges: any[],
  yNodesMap: any,
  yEdgesMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  setEdges: (updater: (edges: any[]) => any[]) => void,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null
) => {
  return (edgeId: string, newType: "negation" | "support") => {
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    const edge = edges.find((e: any) => e.id === edgeId);
    if (!edge) return;

    const src = nodes.find((n: any) => n.id === edge.source);
    const tgt = nodes.find((n: any) => n.id === edge.target);
    if (!src || !tgt) return;

    if (edge.type !== "negation" && edge.type !== "support") return;
    if (edge.type === newType) return;

    setEdges((eds) =>
      eds.map((e) => (e.id === edgeId ? { ...e, type: newType } : e))
    );

    if (yEdgesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        const base = yEdgesMap.get(edgeId);
        if (base) {
          yEdgesMap.set(edgeId, { ...base, type: newType });
        }
      }, localOrigin);
    }
  };
};

export const createEnsureEdgeAnchor = (
  yNodesMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object
) => {
  return (anchorId: string, parentEdgeId: string, x: number, y: number) => {
    if (!yNodesMap || !ydoc || !canWrite) return;
    try {
      if (typeof anchorId !== 'string' || !anchorId) return;
      ydoc.transact(() => {
        if (!yNodesMap.has(anchorId)) {
          yNodesMap.set(anchorId, {
            id: anchorId,
            type: 'edge_anchor',
            position: { x, y },
            data: { parentEdgeId },
          });
        }
      }, localOrigin);
    } catch {}
  };
};

export const createUpdateEdgeAnchorPosition = (
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  yNodesMap?: any,
  ydoc?: any,
  canWrite?: boolean,
  localOrigin?: object,
  layoutOrigin?: any
) => {
  // Cache last positions to avoid redundant state updates from repeated effects
  const lastPos = new Map<string, { x: number; y: number }>();
  const eps = 0.01;
  return (edgeId: string, x: number, y: number, force?: boolean) => {
    const prev = lastPos.get(edgeId);
    if (!force && prev && Math.abs(prev.x - x) < eps && Math.abs(prev.y - y) < eps) {
      return;
    }
    lastPos.set(edgeId, { x, y });

    const anchorId = `anchor:${edgeId}`;
    let changedAnchorId: string | null = null;

    setNodes((nds) => {
      let changed = false;
      const updated = nds.map((n: any) => {
        if (!(n.type === "edge_anchor" && (n.data?.parentEdgeId === edgeId || n.id === anchorId))) {
          return n;
        }
        const px = n.position?.x ?? 0;
        const py = n.position?.y ?? 0;
        if (Math.abs(px - x) < eps && Math.abs(py - y) < eps) {
          return n;
        }
        changed = true;
        changedAnchorId = n.id;
        return { ...n, position: { x, y } };
      });
      return changed ? updated : nds;
    });

    // Sync to Yjs so peers get the anchor update or a forced re-write
    try {
      if (yNodesMap && ydoc && canWrite) {
        const idToWrite = ((): string | null => {
          if (changedAnchorId) return changedAnchorId;
          // Fallback to deterministic id when forcing a sync
          if (force && (yNodesMap as any).has(anchorId)) return anchorId;
          return null;
        })();

        if (idToWrite) {
          (ydoc as any).transact(() => {
            const base = (yNodesMap as any).get(idToWrite as any);
            if (base) {
              (yNodesMap as any).set(idToWrite as any, {
                ...base,
                position: { x, y },
              });
            }
          }, localOrigin || {});
        }
      }
    } catch {}
  };
};
