import React from "react";
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import * as Y from "yjs";
import { chooseEdgeType } from './connectUtils';

export const generateEdgeId = (): string => {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

export const deterministicEdgeId = (
  type: string,
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null
) => {
  const sh = sourceHandle || "";
  const th = targetHandle || "";
  return `edge:${type}:${source}:${sh}->${target}:${th}`;
};

export const createEdgeByType = (
  edgeType: string,
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null
): Edge => {
  return {
    id: deterministicEdgeId(
      edgeType,
      source,
      target,
      sourceHandle,
      targetHandle
    ),
    source,
    target,
    sourceHandle: sourceHandle || null,
    targetHandle: targetHandle || null,
    type: edgeType,
  };
};

export const createGraphChangeHandlers = (
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void,
  yNodesMap: Y.Map<Node> | null,
  yEdgesMap: Y.Map<Edge> | null,
  ydoc: Y.Doc | null,
  syncYMapFromArray: <T extends { id: string }>(
    ymap: Y.Map<T>,
    arr: T[]
  ) => void,
  localOrigin?: any,
  getCurrentNodes?: () => Node[]
) => {
  // Delta-based node sync: only write changed positions to Yjs during drags
  let rafEdgesId: number | null = null;
  let pendingEdges: Edge[] | null = null;
  const isSameNodes = (a: Node[], b: Node[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const na: any = a[i];
      const nb: any = b[i];
      if (na.id !== nb.id) return false;
      if (na.type !== nb.type) return false;
      const pa = na.position || { x: 0, y: 0 };
      const pb = nb.position || { x: 0, y: 0 };
      if (pa.x !== pb.x || pa.y !== pb.y) return false;
      const da = na.data || {};
      const db = nb.data || {};
      if (JSON.stringify(da) !== JSON.stringify(db)) return false;
    }
    return true;
  };

  const isSameEdges = (a: Edge[], b: Edge[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const ea: any = a[i];
      const eb: any = b[i];
      if (ea.id !== eb.id) return false;
      if (ea.source !== eb.source || ea.target !== eb.target) return false;
      if (ea.type !== eb.type) return false;
      if ((ea.sourceHandle || null) !== (eb.sourceHandle || null)) return false;
      if ((ea.targetHandle || null) !== (eb.targetHandle || null)) return false;
    }
    return true;
  };
  const onNodesChange = (changes: any[]) => {
    const m = yNodesMap;
    const d = ydoc;
    setNodes((nds) => {
      const next = applyNodeChanges(changes, nds);
      // Targeted Yjs updates for position/dimensions only
      if (m && d && Array.isArray(changes) && changes.length > 0) {
        const idsToUpdate = new Set<string>();
        for (const ch of changes) {
          if (!ch || typeof ch !== 'object') continue;
          const t = (ch as any).type;
          if (t === 'position' || t === 'dimensions') {
            const id = (ch as any).id as string;
            if (id) idsToUpdate.add(id);
          }
        }
        if (idsToUpdate.size > 0) {
          d.transact(() => {
            for (const id of idsToUpdate) {
              if (!m.has(id)) continue;
              const nextNode = (next as Node[]).find((n) => n.id === id);
              const existing = m.get(id) as Node | undefined;
              if (!nextNode || !existing) continue;
              const samePos =
                (existing.position?.x ?? 0) === (nextNode.position?.x ?? 0) &&
                (existing.position?.y ?? 0) === (nextNode.position?.y ?? 0);

              const nextW = (nextNode as any).width ?? (nextNode as any).measured?.width;
              const nextH = (nextNode as any).height ?? (nextNode as any).measured?.height;
              const existW = (existing as any).width ?? (existing as any).style?.width;
              const existH = (existing as any).height ?? (existing as any).style?.height;
              const dimsChanged = (
                (typeof nextW === 'number' && nextW !== existW) ||
                (typeof nextH === 'number' && nextH !== existH)
              );

              if (!samePos && !dimsChanged) {
                m.set(id, { ...existing, position: nextNode.position } as Node);
                continue;
              }

              if (samePos && !dimsChanged) {
                // nothing to write
                continue;
              }

              const updated: any = { ...existing };
              if (!samePos) {
                updated.position = nextNode.position as any;
              }
              if (dimsChanged) {
                if (typeof nextW === 'number') updated.width = nextW;
                if (typeof nextH === 'number') updated.height = nextH;
                updated.style = {
                  ...(existing as any).style,
                  ...(typeof nextW === 'number' ? { width: nextW } : {}),
                  ...(typeof nextH === 'number' ? { height: nextH } : {}),
                } as any;
              }
              m.set(id, updated as Node);
            }
          }, localOrigin);
        }
      }
      return next;
    });
  };

  const onEdgesChange = (changes: any[]) => {
    const m = yEdgesMap;
    const d = ydoc;
    setEdges((eds) => {
      const next = applyEdgeChanges(changes, eds);
      if (m && d) {
        pendingEdges = next as Edge[];
        if (rafEdgesId == null) {
          rafEdgesId =
            typeof window !== "undefined"
              ? window.requestAnimationFrame(() => {
                  if (pendingEdges && m && d) {
                    d.transact(
                      () => syncYMapFromArray(m, pendingEdges as Edge[]),
                      localOrigin
                    );
                  }
                  pendingEdges = null;
                  if (rafEdgesId != null && typeof window !== "undefined") {
                    window.cancelAnimationFrame(rafEdgesId);
                  }
                  rafEdgesId = null;
                })
              : null;
        }
      }
      return next;
    });
  };

  const onConnect = (params: {
    source?: string;
    target?: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => {
    if (!params.source || !params.target) return;

    const currentNodes = getCurrentNodes?.() || [];
    const sourceNode = currentNodes.find((n: any) => n.id === params.source);
    const targetNode = currentNodes.find((n: any) => n.id === params.target);
    const edgeType = chooseEdgeType(sourceNode?.type, targetNode?.type);
    
    const edge = createEdgeByType(
      edgeType,
      params.source,
      params.target,
      params.sourceHandle,
      params.targetHandle
    );

    // Optimistic local update
    setEdges((eds) => addEdge(edge, eds));

    // Sync to Yjs map
    const m = yEdgesMap;
    const d = ydoc;
    if (m && d)
      d.transact(() => {
        if (!m.has(edge.id)) m.set(edge.id, edge);
      }, localOrigin);
  };

  const commitNodePositions = (nodes: Node[]) => {
    const m = yNodesMap;
    const d = ydoc;
    if (m && d) {
      // Merge-only: update positions for known ids
      d.transact(() => {
        for (const n of nodes) {
          if (!m.has(n.id)) continue;
          const curr = m.get(n.id) as Node | undefined;
          if (!curr) continue;
          const samePos =
            (curr.position?.x ?? 0) === (n.position?.x ?? 0) &&
            (curr.position?.y ?? 0) === (n.position?.y ?? 0);
          if (samePos) continue;
          m.set(n.id, { ...curr, position: n.position } as Node);
        }
      }, localOrigin);
    }
  };

  const flushPendingChanges = () => {
    const mN = yNodesMap;
    const mE = yEdgesMap;
    const d = ydoc;
    if (typeof window !== "undefined") {
      if (rafEdgesId != null) {
        window.cancelAnimationFrame(rafEdgesId);
        rafEdgesId = null;
      }
    }
    if (d) {
      if (mE && pendingEdges) {
        d.transact(
          () => syncYMapFromArray(mE, pendingEdges as Edge[]),
          localOrigin
        );
        pendingEdges = null;
      }
    }
  };

  return {
    onNodesChange,
    onEdgesChange,
    onConnect,
    commitNodePositions,
    flushPendingChanges,
  };
};

export const createNodeDragHandler = (
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
  username: string
) => {
  return (event: React.MouseEvent, node: Node) => {
    // Add visual indicator that this node is being edited
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        editedBy: username,
      },
    };

    setNodes((nds) => nds.map((n) => (n.id === node.id ? updatedNode : n)));

    // Clear the indicator after 2 seconds
    setTimeout(() => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? {
                ...n,
                data: {
                  ...n.data,
                  editedBy: undefined,
                },
              }
            : n
        )
      );
    }, 2000);
  };
};
