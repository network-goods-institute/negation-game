import { generateEdgeId } from "./graphSync";
import * as Y from "yjs";
import { toast } from "sonner";

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
  return (type: "point" | "statement" | "objection", x: number, y: number) => {
    const idBase =
      type === "statement" ? "s" : type === "objection" ? "o" : "p";
    const id = `${idBase}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const data: any =
      type === "statement"
        ? { statement: "New Statement" }
        : type === "objection"
          ? { content: "New objection" }
          : { content: "New point" };
    const node: any = { id, type, position: { x, y }, data };

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
    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      return;
    }

    const nodesToDelete = new Set<string>([nodeId]);
    const edgesToDelete = new Set<string>();

    const getIncidentEdges = (nid: string) =>
      edges.filter((e: any) => e.source === nid || e.target === nid);

    let changed = true;
    while (changed) {
      changed = false;

      // For each node marked, mark all incident edges
      for (const nid of Array.from(nodesToDelete)) {
        for (const e of getIncidentEdges(nid)) {
          if (!edgesToDelete.has(e.id)) {
            edgesToDelete.add(e.id);
            changed = true;

            // If this edge has objections, mark their parts
            // Find anchors for this base edge
            for (const n of nodes) {
              if (n.type === "edge_anchor" && n.data?.parentEdgeId === e.id) {
                if (!nodesToDelete.has(n.id)) {
                  nodesToDelete.add(n.id);
                  changed = true;
                }
                // objection nodes tied to this base edge
                for (const on of nodes) {
                  if (
                    on.type === "objection" &&
                    on.data?.parentEdgeId === e.id
                  ) {
                    if (!nodesToDelete.has(on.id)) {
                      nodesToDelete.add(on.id);
                      changed = true;
                    }
                  }
                }
                // objection edges pointing from objection to the anchor
                for (const oe of edges) {
                  if (
                    oe.type === "objection" &&
                    nodesToDelete.has(n.id) &&
                    oe.target === n.id
                  ) {
                    if (!edgesToDelete.has(oe.id)) {
                      edgesToDelete.add(oe.id);
                      changed = true;
                    }
                  }
                }
              }
            }
          }
        }
      }

      // After marking edges, remove orphan nodes (non-statement) that will have no edges remaining
      const remainingEdges = edges.filter((e: any) => !edgesToDelete.has(e.id));
      const degree = new Map<string, number>();
      for (const e of remainingEdges) {
        degree.set(e.source, (degree.get(e.source) || 0) + 1);
        degree.set(e.target, (degree.get(e.target) || 0) + 1);
      }
      for (const n of nodes) {
        if (nodesToDelete.has(n.id)) continue;
        if (n.type === "statement") continue;
        const deg = degree.get(n.id) || 0;
        if (deg === 0) {
          nodesToDelete.add(n.id);
          changed = true;
        }
      }
    }

    // Compute final arrays
    const finalNodes = nodes.filter((n: any) => !nodesToDelete.has(n.id));
    const finalEdges = edges.filter((e: any) => !edgesToDelete.has(e.id));

    if (yNodesMap && yEdgesMap && ydoc && isLeader) {
      ydoc.transact(() => {
        // delete edges first
        for (const eid of edgesToDelete) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yEdgesMap.delete(eid as any);
        }
        // delete nodes + text entries
        for (const nid of nodesToDelete) {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yNodesMap.delete(nid as any);
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          try {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yTextMap?.delete(nid as any);
          } catch {}
        }
      }, localOrigin);
    } else {
      setEdges(() => finalEdges);
      setNodes(() => finalNodes);
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
  getLockOwner?: (nodeId: string) => { name?: string } | null
) => {
  return (parentNodeId: string) => {
    if (!isLeader) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    if (isLockedForMe?.(parentNodeId)) {
      const owner = getLockOwner?.(parentNodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    const now = Date.now();
    const last = lastAddRef.current[parentNodeId] || 0;
    if (now - last < 500) return;
    lastAddRef.current[parentNodeId] = now;
    const parent = nodes.find((n: any) => n.id === parentNodeId);
    if (!parent) return;
    const newId = `p-${now}-${Math.floor(Math.random() * 1e6)}`;
    const newPos = { x: parent.position.x, y: parent.position.y + 180 };
    const newNode: any = {
      id: newId,
      type: "point",
      position: newPos,
      data: { content: "New point" },
    };
    const edgeType = parent.type === "statement" ? "statement" : "negation";
    const newEdge: any = {
      id: generateEdgeId(),
      type: edgeType,
      source: newId,
      target: parentNodeId,
      sourceHandle: `${newId}-source-handle`,
      targetHandle: `${parentNodeId}-incoming-handle`,
    };
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
    } else {
      setNodes((curr) => [...curr, newNode]);
      setEdges((eds) => [...eds, newEdge]);
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
      data: { content: "New objection", parentEdgeId: edgeId },
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
  setNodes: (updater: (nodes: any[]) => any[]) => void
) => {
  return (edgeId: string, x: number, y: number) => {
    setNodes((nds) => {
      let changed = false;
      const updated = nds.map((n: any) => {
        if (!(n.type === "edge_anchor" && n.data?.parentEdgeId === edgeId))
          return n;
        // Only tiny threshold to prevent exact duplicate positions, not visible movement
        if (
          Math.abs(n.position.x - x) < 0.01 &&
          Math.abs(n.position.y - y) < 0.01
        )
          return n;
        changed = true;
        return { ...n, position: { x, y } };
      });
      return changed ? updated : nds;
    });
  };
};
