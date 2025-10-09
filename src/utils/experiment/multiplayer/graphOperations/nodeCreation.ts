import * as Y from "yjs";
import { toast } from "sonner";
import type { MutableRefObject } from "react";

import {
  calculateNodePositionBelow,
  calculateNodePositionRight,
  getDefaultContentForType,
} from "./shared";
import { generateEdgeId } from "../graphSync";
import { chooseEdgeType } from "../connectUtils";

type PreferredEdgeType = "support" | "negation";

interface CreateAddPointBelowOptions {
  getPreferredEdgeType?: (context: { parent: any }) => PreferredEdgeType;
  onEdgeCreated?: (context: {
    nodeId: string;
    edgeId: string;
    edgeType: string;
  }) => void;
  onNodeCreated?: () => void;
}

export const createAddNodeAtPosition = (
  yNodesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  onNodeCreated?: () => void
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

    // Clear all existing selections and add new node
    onNodeCreated?.();
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), node]);

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
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null,
  getViewportOffset?: () => { x: number; y: number },
  onNodeCreated?: () => void
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

    const newPos = calculateNodePositionRight(parent, nodes, getViewportOffset);
    const newNode: any = {
      id: newId,
      type: "point",
      position: { x: newPos.x, y: newPos.y + 96 },
      data: { content: "New point", favor: 5, createdAt: Date.now() },
      selected: false,
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
    // Clear all existing selections and add new node/edge
    onNodeCreated?.();
    setNodes((curr) => [
      ...curr.map((n) => ({ ...n, selected: false })),
      newNode,
    ]);
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
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null,
  getViewportOffset?: () => { x: number; y: number },
  onNodeCreated?: () => void
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
      position: { x: newPos.x, y: newPos.y + 96 },
      data: { content: "New Support", favor: 5, createdAt: Date.now() },
      selected: false,
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
    // Clear all existing selections and add new node/edge
    onNodeCreated?.();
    setNodes((curr) => [
      ...curr.map((n) => ({ ...n, selected: false })),
      newNode,
    ]);
    setEdges((eds) => [...eds, newEdge]);

    if (yNodesMap && yEdgesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        yNodesMap.set(newId, newNode);
        yEdgesMap.set(newEdge.id, newEdge);
        if (yTextMap && !yTextMap.get(newId)) {
          const t = new Y.Text();
          t.insert(0, "New Support");
          yTextMap.set(newId, t);
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
  isLockedForMe?: (nodeId: string) => boolean,
  getLockOwner?: (nodeId: string) => { name?: string } | null,
  getViewportOffset?: () => { x: number; y: number },
  options?: CreateAddPointBelowOptions
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

    const parentType = parent.type;
    const preferred = options?.getPreferredEdgeType?.({ parent });
    const edgeType = chooseEdgeType("point", parentType, preferred);

    const newPos = calculateNodePositionBelow(parent, nodes, getViewportOffset);
    const defaultContent =
      parentType === "statement" || parentType === "title"
        ? "New Option"
        : edgeType === "support"
          ? "New Support"
          : edgeType === "negation"
            ? "New Negation"
            : "New Point";

    const newNode: any = {
      id: newId,
      type: "point",
      position: { x: newPos.x, y: newPos.y + 96 },
      data: { content: defaultContent, favor: 5, createdAt: Date.now() },
      selected: false,
    };
    const newEdge: any = {
      id: generateEdgeId(),
      type: edgeType,
      source: newId,
      target: parentNodeId,
      sourceHandle: `${newId}-source-handle`,
      targetHandle: `${parentNodeId}-incoming-handle`,
      data: { relevance: 3 },
    };
    // Clear all existing selections and add new node/edge
    options?.onNodeCreated?.();
    setNodes((curr) => [
      ...curr.map((n) => ({ ...n, selected: false })),
      newNode,
    ]);
    setEdges((eds) => [...eds, newEdge]);

    if (yNodesMap && yEdgesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        yNodesMap.set(newId, newNode);
        yEdgesMap.set(newEdge.id, newEdge);
        if (yTextMap && !yTextMap.get(newId)) {
          const t = new Y.Text();
          t.insert(0, defaultContent);
          yTextMap.set(newId, t);
        }
      }, localOrigin);
    }

    const result = { nodeId: newId, edgeId: newEdge.id, edgeType };
    options?.onEdgeCreated?.(result);
    return result;
  };
};
