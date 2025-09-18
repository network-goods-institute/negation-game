import * as Y from "yjs";
import { toast } from "sonner";
import type { MutableRefObject } from "react";

import { calculateNodePositionBelow, getDefaultContentForType } from "./shared";
import { generateEdgeId } from "../graphSync";
import { chooseEdgeType } from "../connectUtils";

export const createAddNodeAtPosition = (
  yNodesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
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
    const initial = getDefaultContentForType(type);
    const data: any =
      type === "statement" ? { statement: initial } : { content: initial };
    const baseData: any =
      type === "statement" ? { statement: initial } : { content: initial };
    const withFavor = (t: typeof type) =>
      t === "point" || t === "objection" ? { favor: 5 } : {};
    const node: any = {
      id,
      type,
      position: { x, y },
      data: { ...baseData, ...withFavor(type), createdAt: Date.now() },
      selected: true,
    };

    // local UI responsiveness
    setNodes((nds) => [...nds, node]);

    if (yNodesMap && ydoc && canWrite) {
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



export const createAddNegationBelow = (
  nodes: any[],
  yNodesMap: any,
  yEdgesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  lastAddRef: MutableRefObject<Record<string, number>>,
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
    if (!canWrite) {
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

    const newPos = calculateNodePositionBelow(parent, nodes, getViewportOffset);
    const newNode: any = {
      id: newId,
      type: "point",
      position: newPos,
      data: { content: "New point", favor: 5, createdAt: Date.now() },
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

    if (yNodesMap && yEdgesMap && ydoc && canWrite) {
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



export const createAddSupportBelow = (
  nodes: any[],
  yNodesMap: any,
  yEdgesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  lastAddRef: MutableRefObject<Record<string, number>>,
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
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
    }
    const now = Date.now();
    const last = lastAddRef.current[parentNodeId] || 0;
    if (now - last < 500) return;
    lastAddRef.current[parentNodeId] = now;
    const parent = nodes.find((n: any) => n.id === parentNodeId);
    if (!parent) return;
    const newId = `p-${now}-${Math.floor(Math.random() * 1e6)}`;

    const newPos = calculateNodePositionBelow(parent, nodes, getViewportOffset);
    const newNode: any = {
      id: newId,
      type: "point",
      position: newPos,
      data: { content: "New support", favor: 5, createdAt: Date.now() },
      selected: true,
    };
    const newEdge: any = {
      id: generateEdgeId(),
      type: "support",
      source: newId,
      target: parentNodeId,
      sourceHandle: `${newId}-source-handle`,
      targetHandle: `${parentNodeId}-incoming-handle`,
      data: { relevance: 3 },
    };
    setNodes((curr) => [...curr, newNode]);
    setEdges((eds) => [...eds, newEdge]);

    if (yNodesMap && yEdgesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        yNodesMap.set(newId, newNode);
        yEdgesMap.set(newEdge.id, newEdge);
        if (yTextMap && !yTextMap.get(newId)) {
          const t = new Y.Text();
          t.insert(0, "New support");
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
  canWrite: boolean,
  localOrigin: object,
  lastAddRef: MutableRefObject<Record<string, number>>,
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
    if (!canWrite) {
      toast.warning("Read-only mode: Changes won't be saved");
    }
    const now = Date.now();
    const last = lastAddRef.current[parentNodeId] || 0;
    if (now - last < 500) return;
    lastAddRef.current[parentNodeId] = now;
    const parent = nodes.find((n: any) => n.id === parentNodeId);
    if (!parent) return;
    const newId = `p-${now}-${Math.floor(Math.random() * 1e6)}`;

    const newPos = calculateNodePositionBelow(parent, nodes, getViewportOffset);
    const newNode: any = {
      id: newId,
      type: "point",
      position: newPos,
      data: { content: "New option", favor: 5, createdAt: Date.now() },
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

    if (yNodesMap && yEdgesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        yNodesMap.set(newId, newNode);
        yEdgesMap.set(newEdge.id, newEdge);
        if (yTextMap && !yTextMap.get(newId)) {
          const t = new Y.Text();
          t.insert(0, "New option");
          yTextMap.set(newId, t);
          try {
            registerTextInUndoScope?.(t);
          } catch {}
        }
      }, localOrigin);
    }
  };
};

