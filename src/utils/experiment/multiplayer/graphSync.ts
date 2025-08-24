import React from "react";
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import * as Y from "yjs";

export const generateEdgeId = (): string => {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

export const createNegationEdge = (
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null
): Edge => {
  return {
    id: generateEdgeId(),
    source,
    target,
    sourceHandle: sourceHandle || null,
    targetHandle: targetHandle || null,
    type: "negation",
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
  localOrigin?: any
) => {
  let rafNodesId: number | null = null;
  let pendingNodes: Node[] | null = null;
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

      if (m && d) {
        pendingNodes = next as Node[];
        if (rafNodesId == null) {
          rafNodesId =
            typeof window !== "undefined"
              ? window.requestAnimationFrame(() => {
                  if (pendingNodes && m && d) {
                    d.transact(
                      () => syncYMapFromArray(m, pendingNodes as Node[]),
                      localOrigin
                    );
                  }
                  pendingNodes = null;
                  if (rafNodesId != null && typeof window !== "undefined") {
                    window.cancelAnimationFrame(rafNodesId);
                  }
                  rafNodesId = null;
                })
              : null;
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

    const edge = createNegationEdge(
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
    if (m && d) d.transact(() => m.set(edge.id, edge), localOrigin);
  };

  const commitNodePositions = (nodes: Node[]) => {
    const m = yNodesMap;
    const d = ydoc;
    if (m && d) {
      d.transact(() => syncYMapFromArray(m, nodes), localOrigin);
    }
  };

  return {
    onNodesChange,
    onEdgesChange,
    onConnect,
    commitNodePositions,
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
