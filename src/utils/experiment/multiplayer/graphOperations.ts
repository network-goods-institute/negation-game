import { generateEdgeId } from "./graphSync";
import { chooseEdgeType } from "./connectUtils";
import * as Y from "yjs";
import { toast } from "sonner";

const calculateNodePositionBelow = (
  parentPosition: { x: number; y: number },
  getViewportOffset?: () => { x: number; y: number }
) => {
  const viewportOffset = getViewportOffset?.() || { x: 0, y: 0 };
  const baseOffset = 30; // Base vertical offset in flow coordinates
  return {
    x: parentPosition.x + viewportOffset.x,
    y: parentPosition.y + baseOffset + viewportOffset.y,
  };
};

export const createUpdateNodeContent = (
  yTextMap: any,
  ydoc: any,
  isLeader: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  registerTextInUndoScope?: (t: any) => void
) => {
  return (nodeId: string, content: string) => {
    if (!isLeader) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    if (yTextMap && ydoc && isLeader) {
      ydoc.transact(() => {
        let t = yTextMap.get(nodeId);
        if (!t) {
          t = new Y.Text();
          if (t) {
            yTextMap.set(nodeId, t);
            // Register new Y.Text instance immediately
            try {
              registerTextInUndoScope?.(t);
            } catch {}
          }
        }
        if (t) {
          const curr = t.toString();
          if (curr === content) return;
          let start = 0;
          while (
            start < curr.length &&
            start < content.length &&
            curr[start] === content[start]
          )
            start++;
          let endCurr = curr.length - 1;
          let endNew = content.length - 1;
          while (
            endCurr >= start &&
            endNew >= start &&
            curr[endCurr] === content[endNew]
          ) {
            endCurr--;
            endNew--;
          }
          const deleteLen = Math.max(0, endCurr - start + 1);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          if (deleteLen > 0) t.delete(start, deleteLen);
          const insertText = content.slice(start, endNew + 1);
          if (insertText.length > 0) t.insert(start, insertText);
        }
      }, localOrigin);
    } else {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data:
                  n.type === "statement"
                    ? { ...n.data, statement: content }
                    : { ...n.data, content },
              }
            : n
        )
      );
    }
  };
};

export const createUpdateNodeHidden = (
  yNodesMap: any,
  ydoc: any,
  isLeader: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void
) => {
  return (nodeId: string, hidden: boolean) => {
    let nextFromState: any | null = null;
    setNodes((nds) => {
      const updated = nds.map((n: any) => {
        if (n.id !== nodeId) return n;
        const nn = { ...n, data: { ...(n.data || {}), hidden } };
        nextFromState = nn;
        return nn;
      });
      return updated;
    });
    if (yNodesMap && ydoc && isLeader) {
      const base = nextFromState || yNodesMap.get(nodeId);
      if (base) {
        ydoc.transact(() => {
          yNodesMap.set(nodeId, base);
        }, localOrigin);
      }
    }
  };
};

export const createAddNodeAtPosition = (
  yNodesMap: any,
  yTextMap: any,
  ydoc: any,
  isLeader: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void
) => {
  return (
    type: "point" | "statement" | "title" | "objection",
    x: number,
    y: number
  ) => {
    const idBase =
      type === "statement"
        ? "s"
        : type === "objection"
          ? "o"
          : type === "title"
            ? "t"
            : "p";
    const id = `${idBase}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const data: any =
      type === "statement"
        ? { statement: "New Statement" }
        : type === "objection"
          ? { content: "New objection" }
          : type === "title"
            ? { content: "New Title" }
            : { content: "New point" };
    const node: any = {
      id,
      type,
      position: { x, y },
      data: { ...data, createdAt: Date.now() },
      selected: true,
    };

    // local UI responsiveness
    setNodes((nds) => [...nds, node]);

    if (yNodesMap && ydoc && isLeader) {
      ydoc.transact(() => {
        yNodesMap.set(id, node);
        if (
          yTextMap &&
          (type === "point" || type === "objection" || type === "statement")
        ) {
          const t = new Y.Text();
          const initial =
            type === "statement" ? data.statement || "" : data.content || "";
          if (initial) t.insert(0, initial);
          yTextMap.set(id, t);
        }
      }, localOrigin);
    }
  };
};

export const createDeleteNode = (
  nodes: any[],
  edges: any[],
  yNodesMap: any,
  yEdgesMap: any,
  yTextMap: any,
  ydoc: any,
  isLeader: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  setEdges: (updater: (edges: any[]) => any[]) => void,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null
) => {
  return (nodeId: string) => {
    if (!isLeader) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    if (isLockedForMe?.(nodeId)) {
      const owner = getLockOwner?.(nodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    const edge = edges.find((e: any) => e.id === nodeId);
    if (edge) {
      const edgesToDelete = [edge];
      const nodesToDelete: string[] = [];

      const anchorNode = nodes.find((n: any) => n.id === `anchor:${edge.id}`);
      if (anchorNode) {
        nodesToDelete.push(anchorNode.id);

        const objectionEdges = edges.filter(
          (e: any) =>
            e.type === "objection" &&
            (e.source === anchorNode.id || e.target === anchorNode.id)
        );
        edgesToDelete.push(...objectionEdges);

        for (const objEdge of objectionEdges) {
          const objectionNodeId =
            objEdge.source === anchorNode.id ? objEdge.target : objEdge.source;
          const objectionNode = nodes.find(
            (n: any) => n.id === objectionNodeId && n.type === "objection"
          );
          if (objectionNode) {
            nodesToDelete.push(objectionNode.id);
          }
        }
      }

      // First sync to Yjs, then update local state
      if (yEdgesMap && yNodesMap && ydoc) {
        ydoc.transact(() => {
          for (const e of edgesToDelete) {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yEdgesMap.delete(e.id as any);
          }
          for (const nodeId of nodesToDelete) {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yNodesMap.delete(nodeId as any);
            try {
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              yTextMap?.delete(nodeId as any);
            } catch {}
          }
        }, localOrigin);

        // Update local state after Yjs sync
        setEdges((eds) =>
          eds.filter((e: any) => !edgesToDelete.some((del) => del.id === e.id))
        );
        setNodes((nds) =>
          nds.filter((n: any) => !nodesToDelete.includes(n.id))
        );
      } else {
        // Fallback for non-multiplayer mode
        setEdges((eds) =>
          eds.filter((e: any) => !edgesToDelete.some((del) => del.id === e.id))
        );
        setNodes((nds) =>
          nds.filter((n: any) => !nodesToDelete.includes(n.id))
        );
      }
      return;
    }

    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      return;
    }
    const incidentEdges = edges.filter(
      (e: any) => e.source === nodeId || e.target === nodeId
    );

    const allEdgesToDelete = [...incidentEdges];
    const allNodesToDelete: string[] = [];

    for (const incidentEdge of incidentEdges) {
      const anchorNode = nodes.find(
        (n: any) => n.id === `anchor:${incidentEdge.id}`
      );
      if (anchorNode) {
        allNodesToDelete.push(anchorNode.id);

        const objectionEdges = edges.filter(
          (e: any) =>
            e.type === "objection" &&
            (e.source === anchorNode.id || e.target === anchorNode.id)
        );
        allEdgesToDelete.push(...objectionEdges);

        for (const objEdge of objectionEdges) {
          const objectionNodeId =
            objEdge.source === anchorNode.id ? objEdge.target : objEdge.source;
          const objectionNode = nodes.find(
            (n: any) => n.id === objectionNodeId && n.type === "objection"
          );
          if (objectionNode) {
            allNodesToDelete.push(objectionNode.id);
          }
        }
      }
    }

    // First sync to Yjs, then update local state to ensure consistency
    if (yNodesMap && yEdgesMap && ydoc) {
      console.log(
        `[mp] Deleting node ${nodeId} with edges:`,
        allEdgesToDelete.map((e) => e.id)
      );
      ydoc.transact(() => {
        for (const e of allEdgesToDelete) {
          console.log(`[mp] Deleting edge ${e.id}`);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yEdgesMap.delete(e.id as any);
        }
        console.log(`[mp] Deleting main node ${nodeId}`);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        yNodesMap.delete(nodeId as any);
        try {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yTextMap?.delete(nodeId as any);
        } catch {}
        // Delete objection nodes
        for (const objectionNodeId of allNodesToDelete) {
          console.log(`[mp] Deleting objection node ${objectionNodeId}`);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yNodesMap.delete(objectionNodeId as any);
          try {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yTextMap?.delete(objectionNodeId as any);
          } catch {}
        }
      }, localOrigin);

      // Update local state after Yjs sync
      setEdges((eds) =>
        eds.filter((e: any) => !allEdgesToDelete.some((del) => del.id === e.id))
      );
      setNodes((nds) =>
        nds.filter(
          (n: any) => n.id !== nodeId && !allNodesToDelete.includes(n.id)
        )
      );
    } else {
      // Fallback for non-multiplayer mode
      setEdges((eds) =>
        eds.filter((e: any) => !allEdgesToDelete.some((del) => del.id === e.id))
      );
      setNodes((nds) =>
        nds.filter(
          (n: any) => n.id !== nodeId && !allNodesToDelete.includes(n.id)
        )
      );
    }
  };
};

export const createAddNegationBelow = (
  nodes: any[],
  yNodesMap: any,
  yEdgesMap: any,
  yTextMap: any,
  ydoc: any,
  isLeader: boolean,
  localOrigin: object,
  lastAddRef: React.MutableRefObject<Record<string, number>>,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  setEdges: (updater: (edges: any[]) => any[]) => void,
  registerTextInUndoScope?: (t: any) => void,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null,
  getViewportOffset?: () => { x: number; y: number }
) => {
  return (parentNodeId: string) => {
    if (isLockedForMe?.(parentNodeId)) {
      const owner = getLockOwner?.(parentNodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    if (!isLeader) {
      // Allow local-only preview; will not sync to Yjs
      toast.warning("Read-only mode: Changes won't be saved");
    }
    const now = Date.now();
    const last = lastAddRef.current[parentNodeId] || 0;
    if (now - last < 500) return;
    lastAddRef.current[parentNodeId] = now;
    const parent = nodes.find((n: any) => n.id === parentNodeId);
    if (!parent) return;
    const newId = `p-${now}-${Math.floor(Math.random() * 1e6)}`;

    const newPos = calculateNodePositionBelow(
      parent.position,
      getViewportOffset
    );
    const newNode: any = {
      id: newId,
      type: "point",
      position: newPos,
      data: { content: "New point", favor: 3, createdAt: Date.now() },
      selected: true, // Auto-select newly created negation nodes
    };
    const edgeType = chooseEdgeType(newNode.type, parent.type);
    const newEdge: any = {
      id: generateEdgeId(),
      type: edgeType,
      source: newId,
      target: parentNodeId,
      sourceHandle: `${newId}-source-handle`,
      targetHandle: `${parentNodeId}-incoming-handle`,
      data: { relevance: 3 },
    };
    // Always update local state immediately for responsiveness
    setNodes((curr) => [...curr, newNode]);
    setEdges((eds) => [...eds, newEdge]);

    if (yNodesMap && yEdgesMap && ydoc && isLeader) {
      ydoc.transact(() => {
        yNodesMap.set(newId, newNode);
        yEdgesMap.set(newEdge.id, newEdge);
        // Create and register Y.Text for the new node immediately
        if (yTextMap && !yTextMap.get(newId)) {
          const t = new Y.Text();
          t.insert(0, "New point");
          yTextMap.set(newId, t);
          try {
            registerTextInUndoScope?.(t);
          } catch {}
        }
      }, localOrigin);
    }
  };
};

export const createAddPointBelow = (
  nodes: any[],
  yNodesMap: any,
  yEdgesMap: any,
  yTextMap: any,
  ydoc: any,
  isLeader: boolean,
  localOrigin: object,
  lastAddRef: React.MutableRefObject<Record<string, number>>,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  setEdges: (updater: (edges: any[]) => any[]) => void,
  registerTextInUndoScope?: (t: any) => void,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null,
  getViewportOffset?: () => { x: number; y: number }
) => {
  return (parentNodeId: string) => {
    if (isLockedForMe?.(parentNodeId)) {
      const owner = getLockOwner?.(parentNodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    if (!isLeader) {
      toast.warning("Read-only mode: Changes won't be saved");
    }
    const now = Date.now();
    const last = lastAddRef.current[parentNodeId] || 0;
    if (now - last < 500) return;
    lastAddRef.current[parentNodeId] = now;
    const parent = nodes.find((n: any) => n.id === parentNodeId);
    if (!parent) return;
    const newId = `p-${now}-${Math.floor(Math.random() * 1e6)}`;

    const newPos = calculateNodePositionBelow(
      parent.position,
      getViewportOffset
    );
    const newNode: any = {
      id: newId,
      type: "point",
      position: newPos,
      data: { content: "New Option", favor: 3, createdAt: Date.now() },
      selected: true, // Auto-select newly created negation nodes
    };
    const edgeType = chooseEdgeType(newNode.type, parent.type);
    const newEdge: any = {
      id: generateEdgeId(),
      type: edgeType,
      source: newId,
      target: parentNodeId,
      sourceHandle: `${newId}-source-handle`,
      targetHandle: `${parentNodeId}-incoming-handle`,
      data: { relevance: 3 },
    };
    setNodes((curr) => [...curr, newNode]);
    setEdges((eds) => [...eds, newEdge]);

    if (yNodesMap && yEdgesMap && ydoc && isLeader) {
      ydoc.transact(() => {
        yNodesMap.set(newId, newNode);
        yEdgesMap.set(newEdge.id, newEdge);
        if (yTextMap && !yTextMap.get(newId)) {
          const t = new Y.Text();
          t.insert(0, "New point");
          yTextMap.set(newId, t);
          try {
            registerTextInUndoScope?.(t);
          } catch {}
        }
      }, localOrigin);
    }
  };
};

export const createAddObjectionForEdge = (
  nodes: any[],
  edges: any[],
  yNodesMap: any,
  yEdgesMap: any,
  yTextMap: any,
  ydoc: any,
  isLeader: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  setEdges: (updater: (edges: any[]) => any[]) => void,
  registerTextInUndoScope?: (t: any) => void,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null
) => {
  return (edgeId: string, overrideMidX?: number, overrideMidY?: number) => {
    if (!isLeader) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    const base = edges.find((e: any) => e.id === edgeId);
    if (!base) return;

    const src = nodes.find((n: any) => n.id === base.source);
    const tgt = nodes.find((n: any) => n.id === base.target);
    if (!src || !tgt) return;
    if (isLockedForMe?.(src.id) || isLockedForMe?.(tgt.id)) {
      const lockedNodeId = isLockedForMe?.(src.id) ? src.id : tgt.id;
      const owner = getLockOwner?.(lockedNodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
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
        content: "New objection",
        parentEdgeId: edgeId,
        createdAt: Date.now(),
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
    if (yNodesMap && yEdgesMap && ydoc && isLeader) {
      ydoc.transact(() => {
        if (!yNodesMap.has(anchorId)) yNodesMap.set(anchorId, anchorNode);
        yNodesMap.set(objectionId, objectionNode);
        if (!yEdgesMap.has(objectionEdge.id))
          yEdgesMap.set(objectionEdge.id, objectionEdge);
        // Create and register Y.Text for the new objection node immediately
        if (yTextMap && !yTextMap.get(objectionId)) {
          const t = new Y.Text();
          t.insert(0, "New objection");
          yTextMap.set(objectionId, t);
          try {
            registerTextInUndoScope?.(t);
          } catch {}
        }
      }, localOrigin);
    }
  };
};

export const createUpdateEdgeAnchorPosition = (
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  yNodesMap?: any,
  ydoc?: any,
  isLeader?: boolean,
  localOrigin?: object
) => {
  // Cache last positions to avoid redundant state updates from repeated effects
  const lastPos = new Map<string, { x: number; y: number }>();
  const eps = 0.01;
  return (edgeId: string, x: number, y: number) => {
    const prev = lastPos.get(edgeId);
    if (prev && Math.abs(prev.x - x) < eps && Math.abs(prev.y - y) < eps) {
      return;
    }
    lastPos.set(edgeId, { x, y });
    let changedAnchorId: string | null = null;
    setNodes((nds) => {
      let changed = false;
      const updated = nds.map((n: any) => {
        if (!(n.type === "edge_anchor" && n.data?.parentEdgeId === edgeId))
          return n;
        const px = n.position?.x ?? 0,
          py = n.position?.y ?? 0;
        if (Math.abs(px - x) < eps && Math.abs(py - y) < eps) return n;
        changed = true;
        changedAnchorId = n.id;
        return { ...n, position: { x, y } };
      });
      return changed ? updated : nds;
    });
    // Sync to Yjs so peers get the anchor update without requiring local recompute
    try {
      if (changedAnchorId && yNodesMap && ydoc && isLeader) {
        (ydoc as any).transact(() => {
          const base = (yNodesMap as any).get(changedAnchorId as any);
          if (base)
            (yNodesMap as any).set(changedAnchorId as any, {
              ...base,
              position: { x, y },
            });
        }, localOrigin || {});
      }
    } catch {}
  };
};
