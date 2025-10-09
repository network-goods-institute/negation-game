import React from "react";
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import * as Y from "yjs";
import { chooseEdgeType } from "./connectUtils";

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
    id: deterministicEdgeId(edgeType, source, target, sourceHandle, targetHandle),
    source,
    target,
    sourceHandle: sourceHandle || null,
    targetHandle: targetHandle || null,
    type: edgeType,
  };
};

const edgesEqual = (a: Edge | undefined, b: Edge) => {
  if (!a) return false;
  return (
    a.id === b.id &&
    a.source === b.source &&
    a.target === b.target &&
    (a.sourceHandle || null) === (b.sourceHandle || null) &&
    (a.targetHandle || null) === (b.targetHandle || null) &&
    a.type === b.type
  );
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
  getCurrentNodes?: () => Node[],
  getPreferredEdgeType?: () => "support" | "negation"
) => {
  let rafEdgesId: number | null = null;
  let pendingEdges: Edge[] | null = null;
  let rafNodesId: number | null = null;
  let pendingNodePositions: Map<string, { x: number; y: number }> | null = null;

  const flushPendingNodePositions = () => {
    if (!ydoc || !yNodesMap || !pendingNodePositions || pendingNodePositions.size === 0) {
      return;
    }
    const entries = pendingNodePositions;
    pendingNodePositions = null;
    ydoc.transact(() => {
      entries.forEach((pos, id) => {
        if (!yNodesMap.has(id)) return;
        const existing = yNodesMap.get(id) as Node | undefined;
        if (!existing) return;
        const samePos =
          (existing.position?.x ?? 0) === (pos?.x ?? 0) &&
          (existing.position?.y ?? 0) === (pos?.y ?? 0);
        if (samePos) return;
        yNodesMap.set(id, { ...existing, position: pos } as Node);
      });
    }, localOrigin);
  };

  const scheduleNodeFlush = () => {
    if (typeof window === "undefined") {
      flushPendingNodePositions();
      return;
    }
    if (rafNodesId != null) return;
    rafNodesId = window.requestAnimationFrame(() => {
      rafNodesId = null;
      flushPendingNodePositions();
    });
  };

  const flushPendingEdges = () => {
    if (!ydoc || !yEdgesMap || !pendingEdges) return;
    const edgesById = new Map<string, Edge>();
    pendingEdges.forEach((edge) => {
      edgesById.set(edge.id, edge);
    });
    pendingEdges = null;
    ydoc.transact(() => {
      edgesById.forEach((edge, id) => {
        const existing = (yEdgesMap as any).get(id) as Edge | undefined;
        if (!edgesEqual(existing, edge)) {
          (yEdgesMap as any).set(id, edge);
        }
      });
    }, localOrigin);
  };

  const scheduleEdgeFlush = () => {
    if (typeof window === "undefined") {
      flushPendingEdges();
      return;
    }
    if (rafEdgesId != null) return;
    rafEdgesId = window.requestAnimationFrame(() => {
      rafEdgesId = null;
      flushPendingEdges();
    });
  };

  const onNodesChange = (changes: any[]) => {
    setNodes((nds) => {
      const next = applyNodeChanges(changes, nds);
      if (Array.isArray(changes) && changes.length > 0) {
        const idsToUpdate = new Set<string>();
        for (const ch of changes) {
          if (!ch || typeof ch !== "object") continue;
          if ((ch as any).type !== "position") continue;
          const id = (ch as any).id as string | undefined;
          if (id) idsToUpdate.add(id);
        }
        if (idsToUpdate.size > 0) {
          pendingNodePositions = pendingNodePositions ?? new Map();
          idsToUpdate.forEach((id) => {
            const nextNode = (next as Node[]).find((n) => n.id === id);
            if (!nextNode) return;
            const position = nextNode.position || { x: 0, y: 0 };
            pendingNodePositions!.set(id, position);
          });
          scheduleNodeFlush();
        }
      }
      return next;
    });
  };

  const onEdgesChange = (changes: any[]) => {
    setEdges((eds) => {
      const next = applyEdgeChanges(changes, eds);
      if (yEdgesMap && ydoc) {
        pendingEdges = next as Edge[];
        scheduleEdgeFlush();
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
    const preferredType = getPreferredEdgeType?.();
    const edgeType = chooseEdgeType(sourceNode?.type, targetNode?.type, preferredType);

    const edge = createEdgeByType(
      edgeType,
      params.source,
      params.target,
      params.sourceHandle,
      params.targetHandle
    );

    setEdges((eds) => addEdge(edge, eds));

    if (yEdgesMap && ydoc) {
      ydoc.transact(() => {
        if (!yEdgesMap.has(edge.id)) yEdgesMap.set(edge.id, edge);
      }, localOrigin);
    }
  };

  const commitNodePositions = (nodes: Node[]) => {
    flushPendingNodePositions();
    if (!yNodesMap || !ydoc) return;
    ydoc.transact(() => {
      for (const node of nodes) {
        if (!yNodesMap.has(node.id)) continue;
        const existing = yNodesMap.get(node.id) as Node | undefined;
        if (!existing) continue;
        const samePos =
          (existing.position?.x ?? 0) === (node.position?.x ?? 0) &&
          (existing.position?.y ?? 0) === (node.position?.y ?? 0);
        if (samePos) continue;
        yNodesMap.set(node.id, { ...existing, position: node.position } as Node);
      }
    }, localOrigin);
  };

  const flushPendingChanges = () => {
    if (typeof window !== "undefined") {
      if (rafEdgesId != null) {
        window.cancelAnimationFrame(rafEdgesId);
        rafEdgesId = null;
      }
      if (rafNodesId != null) {
        window.cancelAnimationFrame(rafNodesId);
        rafNodesId = null;
      }
    }
    flushPendingNodePositions();
    flushPendingEdges();
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
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        editedBy: username,
      },
    };

    setNodes((nds) => nds.map((n) => (n.id === node.id ? updatedNode : n)));

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
