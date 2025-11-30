import * as Y from "yjs";
import { toast } from "sonner";
import { showReadOnlyToast } from "@/utils/readonlyToast";
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
  onNodeAdded?: (id: string) => void;
}

export const createAddNodeAtPosition = (
  yNodesMap: any,
  yTextMap: any,
  ydoc: any,
  canWrite: boolean,
  localOrigin: object,
  setNodes: (updater: (nodes: any[]) => any[]) => void,
  onNodeCreated?: () => void,
  onNodeAdded?: (id: string) => void
) => {
  return (
    type: "point" | "statement" | "title" | "objection" | "comment",
    x: number,
    y: number
  ): string => {
    if (!canWrite) {
      showReadOnlyToast();
      return "";
    }
    const idBase =
      type === "statement"
        ? "s"
        : type === "objection"
          ? "o"
          : type === "title"
            ? "t"
            : type === "comment"
              ? "c"
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
    onNodeAdded?.(id);

    if (yNodesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        yNodesMap.set(id, node);
        if (
          yTextMap &&
          (type === "point" ||
            type === "objection" ||
            type === "statement" ||
            type === "comment")
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
  onNodeCreated?: () => void,
  onNodeAdded?: (id: string) => void
) => {
  return (parentNodeId: string) => {
    if (isLockedForMe?.(parentNodeId)) {
      const owner = getLockOwner?.(parentNodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    if (!canWrite) {
      showReadOnlyToast();
      return;
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
      position: { x: newPos.x, y: newPos.y + 32 },
      data: { content: "New point", favor: 5, createdAt: Date.now() },
      selected: true,
    };
    const edgeType = chooseEdgeType(newNode.type, parent.type);
    const newEdge: any = {
      id: generateEdgeId(),
      type: edgeType,
      source: newId,
      target: parentNodeId,
      sourceHandle: `${newId}-source-handle`,
      targetHandle: `${parentNodeId}-incoming-handle`,
      data: {},
    };
    // Clear all existing selections and add new node/edge
    onNodeCreated?.();
    setNodes((curr) => [
      ...curr.map((n) => ({ ...n, selected: false })),
      newNode,
    ]);
    // Clear any edge selection so text selection in new node works properly
    setEdges((eds) => [
      ...eds.map((e) => ({ ...e, selected: false })),
      newEdge,
    ]);
    onNodeAdded?.(newId);

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
  onNodeCreated?: () => void,
  onNodeAdded?: (id: string) => void
) => {
  return (parentNodeId: string) => {
    if (isLockedForMe?.(parentNodeId)) {
      const owner = getLockOwner?.(parentNodeId);
      toast.warning(`Locked by ${owner?.name || "another user"}`);
      return;
    }
    if (!canWrite) {
      showReadOnlyToast();
      return;
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
      position: { x: newPos.x, y: newPos.y + 32 },
      data: { content: "New Support", favor: 5, createdAt: Date.now() },
      selected: true,
    };
    const newEdge: any = {
      id: generateEdgeId(),
      type: "support",
      source: newId,
      target: parentNodeId,
      sourceHandle: `${newId}-source-handle`,
      targetHandle: `${parentNodeId}-incoming-handle`,
      data: {},
    };
    // Clear all existing selections and add new node/edge
    onNodeCreated?.();
    setNodes((curr) => [
      ...curr.map((n) => ({ ...n, selected: false })),
      newNode,
    ]);
    // Clear any edge selection so text selection in new node works properly
    setEdges((eds) => [
      ...eds.map((e) => ({ ...e, selected: false })),
      newEdge,
    ]);
    onNodeAdded?.(newId);

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
  return (
    parentInput:
      | string
      | string[]
      | { ids: string[]; positionsById?: Record<string, { x: number; y: number }> }
  ) => {
    const parentNodeIds = Array.isArray(parentInput)
      ? parentInput
      : typeof parentInput === "object" && parentInput !== null && "ids" in parentInput
      ? parentInput.ids
      : [parentInput as string];

    const positionsOverride =
      typeof parentInput === "object" && parentInput !== null && "positionsById" in parentInput
        ? (parentInput as any).positionsById || null
        : null;

    const lockedParents = parentNodeIds.filter((id) => isLockedForMe?.(id));
    if (lockedParents.length > 0) {
      const owner = getLockOwner?.(lockedParents[0]);
      toast.warning(
        `${lockedParents.length > 1 ? "Some nodes are" : "Node is"} locked by ${owner?.name || "another user"}`
      );
      return;
    }

    if (!canWrite) {
      showReadOnlyToast();
      return;
    }

    const now = Date.now();

    const parents = parentNodeIds
      .map((id) => nodes.find((n: any) => n.id === id))
      .filter(Boolean);

    if (parents.length === 0) return;

    const firstParentId = parentNodeIds[0];
    const last = lastAddRef.current[firstParentId] || 0;
    if (now - last < 500) return;
    lastAddRef.current[firstParentId] = now;

    const newId = `p-${now}-${Math.floor(Math.random() * 1e6)}`;

    const firstParent = parents[0];
    let newPos;
    const hasMultipleParents = parents.length > 1;
    if (hasMultipleParents) {
      const positions = parentNodeIds.map((pid) => {
        const override = positionsOverride?.[pid];
        const p = parents.find((n: any) => n.id === pid) as any | undefined;
        const x = override?.x ?? p?.position?.x;
        const y = override?.y ?? p?.position?.y;
        const width =
          override?.width ??
          p?.width ??
          p?.measured?.width ??
          p?.style?.width ??
          0;
        const height =
          override?.height ??
          p?.height ??
          p?.measured?.height ??
          p?.style?.height ??
          0;
        return { id: pid, x, y, width, height };
      });
      const valid = positions.filter(
        (p) =>
          Number.isFinite(p.x) &&
          Number.isFinite(p.y) &&
          Number.isFinite(p.width) &&
          Number.isFinite(p.height)
      );
      const centerX =
        valid.reduce((sum, pos) => sum + (pos.x + pos.width / 2), 0) /
        (valid.length || positions.length || 1);
      // Find the lowest parent (max Y + height) instead of averaging
      const lowestBottomEdge =
        valid.length > 0
          ? Math.max(...valid.map((pos) => pos.y + pos.height))
          : 0;
      const avgWidth =
        valid.reduce((sum, pos) => sum + pos.width, 0) /
        (valid.length || positions.length || 1);
      const newWidthEstimate = avgWidth || 200;
      const newX = centerX - newWidthEstimate / 2;
      const newY = lowestBottomEdge + 32;
      newPos = { x: newX, y: newY };
    } else {
      newPos = calculateNodePositionBelow(
        firstParent,
        nodes,
        getViewportOffset
      );
    }

    // Determine content based on parent types
    const parentTypes = new Set(parents.map((p: any) => p.type));
    const firstParentType = firstParent.type;
    let defaultContent = "New Point";

    // Only use type-specific labels when ALL parents are the same type
    // Mixed types always default to "New Point" to avoid confusion
    if (parentTypes.size === 1) {
      // All same type - use appropriate label
      if (firstParentType === "statement" || firstParentType === "title") {
        defaultContent = "New Option";
      } else if (firstParentType === "comment") {
        defaultContent = "New Comment";
      } else {
        // For point/objection parents, determine label based on edge type
        const preferred = options?.getPreferredEdgeType?.({
          parent: firstParent,
        });
        const edgeType = chooseEdgeType("point", firstParentType, preferred);
        if (edgeType === "support") {
          defaultContent = "New Support";
        } else if (edgeType === "negation") {
          defaultContent = "New Negation";
        }
        // If no specific edge type, stays "New Point" (default)
      }
    }
    // If mixed types (parentTypes.size > 1), defaultContent stays "New Point"

    // Create the new node
    const newNode: any = {
      id: newId,
      type: "point",
      position: {
        x: newPos.x,
        y: newPos.y,
      },
      data: { content: defaultContent, favor: 5, createdAt: Date.now() },
      selected: true,
    };

    // Create edges to ALL parents
    const newEdges: any[] = [];
    const results: Array<{ nodeId: string; edgeId: string; edgeType: string }> =
      [];

    for (const parent of parents) {
      const parentType = (parent as any).type;
      const preferred = options?.getPreferredEdgeType?.({ parent });
      const edgeType = chooseEdgeType("point", parentType, preferred);

      const newEdge: any = {
        id: generateEdgeId(),
        type: edgeType,
        source: newId,
        target: (parent as any).id,
        sourceHandle: `${newId}-source-handle`,
        targetHandle: `${(parent as any).id}-incoming-handle`,
        data: {},
      };

      newEdges.push(newEdge);
      results.push({ nodeId: newId, edgeId: newEdge.id, edgeType });
    }

    // Clear all existing selections and add the new node/edges
    options?.onNodeCreated?.();
    setNodes((curr) => [
      ...curr.map((n) => ({ ...n, selected: false })),
      newNode,
    ]);
    // Clear any edge selection so text selection in new node works properly
    setEdges((eds) => [
      ...eds.map((e) => ({ ...e, selected: false })),
      ...newEdges,
    ]);

    // Notify about added node
    options?.onNodeAdded?.(newId);

    if (yNodesMap && yEdgesMap && ydoc && canWrite) {
      ydoc.transact(() => {
        yNodesMap.set(newId, newNode);
        newEdges.forEach((edge) => yEdgesMap.set(edge.id, edge));
        if (yTextMap && !yTextMap.get(newId)) {
          const t = new Y.Text();
          t.insert(0, defaultContent);
          yTextMap.set(newId, t);
        }
      }, localOrigin);
    }

    // Trigger edge created callback for each edge
    results.forEach((result) => options?.onEdgeCreated?.(result));

    // Return single result (the one node with multiple edges)
    return results[0];
  };
};
