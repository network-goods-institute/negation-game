import { generateEdgeId } from "./graphSync";
import { chooseEdgeType } from "./connectUtils";
import * as Y from "yjs";
import { toast } from "sonner";
import { generateInversePoint } from "@/actions/ai/generateInversePoint";

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

const getAbsolutePosition = (node: any, allNodes: any[]) => {
  if (!node) return { x: 0, y: 0 };
  const pos = node.position || { x: 0, y: 0 };
  if (node.parentId) {
    const parent = allNodes.find((n: any) => n.id === node.parentId);
    const ppos = parent?.position || { x: 0, y: 0 };
    return { x: (ppos.x || 0) + (pos.x || 0), y: (ppos.y || 0) + (pos.y || 0) };
  }
  return pos;
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
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  registerTextInUndoScope?: (t: any) => void
) => {
  return (
    type: "point" | "statement" | "title" | "objection",
    x: number,
    y: number
  ): string => {
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
        ? { statement: "New Question" }
        : type === "objection"
          ? { content: "New Objection" }
          : type === "title"
            ? { content: "New Title" }
            : { content: "New Point" };
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
          const initialContent =
            type === "statement" ? data.statement : data.content;
          if (initialContent) t.insert(0, initialContent);
          yTextMap.set(id, t);
          try {
            registerTextInUndoScope?.(t);
          } catch {}
        }
      }, localOrigin);
    }

    return id;
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

    // Prevent deletion of title nodes
    if (node.type === 'title') {
      toast?.warning?.("Cannot delete the title node");
      return;
    }

    // Handle container deletion - convert children back to standalone nodes
    if (node.type === "group") {
      
      const children = nodes.filter((n: any) => n.parentId === nodeId);
      const childrenToStandalone = children.map((child: any) => {
        const parent = nodes.find((n: any) => n.id === nodeId);
        const absoluteX = (parent?.position?.x || 0) + (child.position?.x || 0);
        const absoluteY = (parent?.position?.y || 0) + (child.position?.y || 0);

        return {
          id: child.id,
          type: child.type,
          data: { ...child.data },
          position: { x: absoluteX, y: absoluteY },
          parentId: undefined,
          extent: undefined,
          expandParent: undefined,
          selected: false,
          measured: undefined,
          width: undefined,
          height: undefined,
          positionAbsolute: undefined,
        };
      });

      // Update local state immediately
      setNodes((nds) =>
        nds
          .filter((n: any) => n.id !== nodeId)
          .map((n: any) => {
            const standalone = childrenToStandalone.find(
              (s: any) => s.id === n.id
            );
            return standalone || n;
          })
      );

      // Sync to Yjs
      if (yNodesMap && ydoc) {
        ydoc.transact(() => {
          // Delete the container
          
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yNodesMap.delete(nodeId as any);
          try {
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            yTextMap?.delete(nodeId as any);
          } catch {}

          // Update children to standalone
          for (const child of childrenToStandalone) {
            
            yNodesMap.set(child.id, child);
          }
        }, localOrigin);
      }
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
      
      ydoc.transact(() => {
        for (const e of allEdgesToDelete) {
          
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yEdgesMap.delete(e.id as any);
        }
        
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        yNodesMap.delete(nodeId as any);
        try {
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yTextMap?.delete(nodeId as any);
        } catch {}
        // Delete objection nodes
        for (const objectionNodeId of allNodesToDelete) {
          
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

    const parentAbs = getAbsolutePosition(parent, nodes);
    const newPos = calculateNodePositionBelow(parentAbs, getViewportOffset);
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

    const parentAbs = getAbsolutePosition(parent, nodes);
    const newPos = calculateNodePositionBelow(parentAbs, getViewportOffset);
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
        content: "New negation",
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
          t.insert(0, "New negation");
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

export const createInversePair = (
  nodes: any[],
  yNodesMap: any,
  yTextMap: any,
  yEdgesMap: any,
  ydoc: any,
  isLeader: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  setEdges: (updater: (edges: any[]) => any[]) => void,
  registerTextInUndoScope?: (t: any) => void,
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null
) => {
  return (pointNodeId: string) => {
    if (isLockedForMe?.(pointNodeId)) {
      const owner = getLockOwner?.(pointNodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    if (!isLeader) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    const pointNode = nodes.find((n: any) => n.id === pointNodeId);
    if (!pointNode) return;

    if (pointNode.parentId) {
      toast.warning("Point is already in a container");
      return;
    }

    const now = Date.now();
    const groupId = `group-${now}-${Math.floor(Math.random() * 1e6)}`;
    const inverseId = `inverse-${now}-${Math.floor(Math.random() * 1e6)}`;

    const originalContent = pointNode.data?.content || "";
    const inverseContent = "Generating...";

    const padding = 40;
    const nodeWidth = 250;
    const nodeHeight = 200;
    const containerWidth = nodeWidth * 2 + padding * 3;
    const containerHeight = nodeHeight + padding * 2;

    const groupPosition = {
      x: pointNode.position.x - padding,
      y: pointNode.position.y - padding,
    };

    const groupNode: any = {
      id: groupId,
      type: "group",
      position: groupPosition,
      data: { label: "", isNew: true },
      width: containerWidth,
      height: containerHeight,
      style: { width: containerWidth, height: containerHeight, padding: 8 },
      draggable: false,
    };

    const inverseNode: any = {
      id: inverseId,
      type: "point",
      parentId: groupId,
      position: { x: nodeWidth + padding, y: padding },
      extent: "parent",
      expandParent: true,
      draggable: false,
      data: {
        content: inverseContent,
        favor: 3,
        createdAt: now,
        directInverse: true,
        groupId,
      },
      selected: false,
    };

    const updatedOriginalNode = {
      id: pointNode.id,
      type: pointNode.type,
      data: { ...pointNode.data, originalInPair: true, groupId },
      parentId: groupId,
      position: { x: padding, y: padding },
      extent: "parent",
      expandParent: true,
      draggable: false,
      selected: false,
      measured: undefined,
      width: undefined,
      height: undefined,
      positionAbsolute: undefined,
    };

    // Delete and recreate approach: remove original node, add group + both children
    setNodes(
      (nds) =>
        nds
          .filter((n: any) => n.id !== pointNodeId) // Delete original
          .concat([groupNode, updatedOriginalNode, inverseNode]) // Add all new nodes
    );

    

    // Sync to Yjs in correct order
    if (yNodesMap && ydoc && isLeader) {
      ydoc.transact(() => {
        // Add group first
        yNodesMap.set(groupId, groupNode);

        // Then add/update children with parentId references
        yNodesMap.set(pointNodeId, updatedOriginalNode);
        yNodesMap.set(inverseId, inverseNode);

        // Create Y.Text for the new inverse node
        if (yTextMap && !yTextMap.get(inverseId)) {
          const t = new Y.Text();
          t.insert(0, inverseContent);
          yTextMap.set(inverseId, t);
          try {
            registerTextInUndoScope?.(t);
          } catch {}
        }
      }, localOrigin);
    }

    // Create negation edge between original and inverse
    const negEdge = {
      id: `edge:negation:${pointNodeId}->${inverseId}`,
      source: pointNodeId,
      target: inverseId,
      sourceHandle: null,
      targetHandle: null,
      type: "negation",
      data: {},
    } as any;

    setEdges((eds: any[]) =>
      eds.some((e: any) => e.id === negEdge.id) ? eds : [...eds, negEdge]
    );

    if (yEdgesMap && ydoc && isLeader) {
      ydoc.transact(() => {
        if (!yEdgesMap.has(negEdge.id)) yEdgesMap.set(negEdge.id, negEdge);
      }, localOrigin);
    }

    // Generate AI content and update text
    generateInversePoint(originalContent)
      .then((aiContent) => {
        if (yTextMap && ydoc && isLeader) {
          ydoc.transact(() => {
            const t = yTextMap.get(inverseId);
            if (t) {
              const curr = t.toString();
              if (curr !== aiContent) {
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                if (curr && curr.length) t.delete(0, curr.length);
                if (aiContent) t.insert(0, aiContent);
              }
            }
          }, localOrigin);
        }
      })
      .catch(() => {
        // Fallback to "Not X"
        if (yTextMap && ydoc && isLeader) {
          ydoc.transact(() => {
            const t = yTextMap.get(inverseId);
            if (t) {
              const fallback = `Not ${originalContent}`;
              const curr = t.toString();
              if (curr !== fallback) {
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                if (curr && curr.length) t.delete(0, curr.length);
                if (fallback) t.insert(0, fallback);
              }
            }
          }, localOrigin);
        }
      });

    // One-time equalize heights after initial render
    try {
      setTimeout(() => {
        const origEl = document.querySelector(
          `[data-id="${pointNodeId}"]`
        ) as HTMLElement | null;
        const invEl = document.querySelector(
          `[data-id="${inverseId}"]`
        ) as HTMLElement | null;
        if (!origEl || !invEl) return;
        const h1 = origEl.getBoundingClientRect().height;
        const h2 = invEl.getBoundingClientRect().height;
        const maxH = Math.max(Math.floor(h1), Math.floor(h2));
        if (
          yNodesMap &&
          ydoc &&
          isLeader &&
          Number.isFinite(maxH) &&
          maxH > 0
        ) {
          ydoc.transact(() => {
            const oBase = yNodesMap.get(pointNodeId);
            const iBase = yNodesMap.get(inverseId);
            if (oBase)
              yNodesMap.set(pointNodeId, {
                ...oBase,
                data: { ...(oBase.data || {}), pairHeight: maxH },
              });
            if (iBase)
              yNodesMap.set(inverseId, {
                ...iBase,
                data: { ...(iBase.data || {}), pairHeight: maxH },
              });
          }, localOrigin);
        }
      }, 0);
    } catch {}
  };
};

export const createDeleteInversePair = (
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
  return (inverseNodeId: string) => {
    
    if (!isLeader) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    const inverse = nodes.find((n: any) => n.id === inverseNodeId);
    const groupId = inverse?.parentId;
    if (!inverse || !groupId) {
      
      return;
    }
    const children = nodes.filter((n: any) => n.parentId === groupId);
    const original = children.find((n: any) => n.id !== inverseNodeId) || null;
    if (!original) {
      
      return;
    }
    if (isLockedForMe?.(original.id)) {
      const owner = getLockOwner?.(original.id);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    const group = nodes.find((n: any) => n.id === groupId);
    const groupPos = group?.position || { x: 0, y: 0 };
    const origRel = original?.position || { x: 0, y: 0 };
    const abs = {
      x: (groupPos.x || 0) + (origRel.x || 0),
      y: (groupPos.y || 0) + (origRel.y || 0),
    };

    if (yNodesMap && yEdgesMap && ydoc) {
      ydoc.transact(() => {
        // Update original node to stand-alone
        if (yNodesMap.has(original.id)) {
          
          const base = yNodesMap.get(original.id);
          const updated = {
            ...base,
            parentId: undefined,
            position: abs,
            extent: undefined,
            expandParent: undefined,
            draggable: true,
            data: {
              ...(base?.data || {}),
              originalInPair: undefined,
              directInverse: undefined,
              groupId: undefined,
              originalDetached: undefined,
              pairHeight: undefined,
            },
          } as any;
          yNodesMap.set(original.id, updated);
        }

        // Remove inverse node and its Y.Text (if any)
        if (yNodesMap.has(inverseNodeId)) {
          
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yNodesMap.delete(inverseNodeId);
        }
        if (yTextMap && yTextMap.get(inverseNodeId)) {
          
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yTextMap.delete(inverseNodeId);
        }

        // Remove group node
        if (yNodesMap.has(groupId)) {
          
          // eslint-disable-next-line drizzle/enforce-delete-with-where
          yNodesMap.delete(groupId);
        }

        // Remove edges connected to inverse
        if (typeof yEdgesMap?.forEach === 'function') {
          yEdgesMap.forEach((e: any, eid: string) => {
            if (!e) return;
            if (e.source === inverseNodeId || e.target === inverseNodeId) {
              
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              yEdgesMap.delete(eid as any);
            }
          });
        } else {
          for (const [eid, e] of yEdgesMap as any) {
            if (!e) continue;
            if (e.source === inverseNodeId || e.target === inverseNodeId) {
              
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              (yEdgesMap as any).delete(eid);
            }
          }
        }
      }, localOrigin);

      // Update local state after Yjs sync
      
      setEdges((eds: any[]) =>
        eds.filter(
          (e: any) => e.source !== inverseNodeId && e.target !== inverseNodeId
        )
      );
      setNodes((nds: any[]) =>
        nds
          .filter((n: any) => n.id !== groupId && n.id !== inverseNodeId)
          .map((n: any) =>
            n.id === original.id
              ? {
                  ...n,
                  parentId: undefined,
                  position: abs,
                  extent: undefined,
                  expandParent: undefined,
                  draggable: true,
                  data: {
                    ...(n?.data || {}),
                    originalInPair: undefined,
                    directInverse: undefined,
                    groupId: undefined,
                    originalDetached: undefined,
                    pairHeight: undefined,
                  },
                }
              : n
          )
      );
    }
  };
};

// ALL THESE COMMENTS EXIST AS I SUFFERED FOR IT

export const createUpdateNodeType = (
  yNodesMap: any,
  yTextMap: any,
  ydoc: any,
  isLeader: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  registerTextInUndoScope?: (t: any) => void
) => {
  return (
    nodeId: string,
    newType: "point" | "statement" | "title" | "objection"
  ) => {
    if (!isLeader) {
      toast.warning("Read-only mode: Changes won't be saved");
      return;
    }

    setNodes((nds) =>
      nds.map((n: any) => {
        if (n.id !== nodeId) return n;

        const currentContent =
          n.type === "statement" ? n.data?.statement : n.data?.content;
        const newData =
          newType === "statement"
            ? {
                statement: currentContent || "",
                content: undefined,
                nodeType: undefined,
              }
            : {
                content: currentContent || "",
                statement: undefined,
                nodeType: undefined,
              };

        return {
          ...n,
          type: newType,
          data: newData,
        };
      })
    );

    if (yNodesMap && ydoc && isLeader) {
      ydoc.transact(() => {
        const base = yNodesMap.get(nodeId);
        if (base) {
          const currentContent =
            base.type === "statement"
              ? base.data?.statement
              : base.data?.content;
          const newData =
            newType === "statement"
              ? {
                  statement: currentContent || "",
                  content: undefined,
                  nodeType: undefined,
                }
              : {
                  content: currentContent || "",
                  statement: undefined,
                  nodeType: undefined,
                };

          yNodesMap.set(nodeId, {
            ...base,
            type: newType,
            data: newData,
          });

          // Update Y.Text content if needed
          if (yTextMap) {
            let t = yTextMap.get(nodeId);
            if (!t) {
              t = new Y.Text();
              yTextMap.set(nodeId, t);
              try {
                registerTextInUndoScope?.(t);
              } catch {}
            }
            const newContent =
              newType === "statement" ? newData.statement : newData.content;
            const curr = t.toString();
            if (curr !== newContent) {
              // eslint-disable-next-line drizzle/enforce-delete-with-where
              if (curr && curr.length) t.delete(0, curr.length);
              if (newContent) t.insert(0, newContent);
            }
          }
        }
      }, localOrigin);
    }
  };
};

const getDefaultContentForType = (
  type: "point" | "statement" | "title" | "objection"
): string => {
  switch (type) {
    case "point":
      return "New point";
    case "statement":
      return "New Question";
    case "title":
      return "New Title";
    case "objection":
      return "New negation";
    default:
      return "New point";
  }
};
