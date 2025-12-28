import { useCallback } from "react";
import { toast } from "sonner";
import { showReadOnlyToast } from "@/utils/readonlyToast";
import { Node, Edge } from "@xyflow/react";
import { buildConnectionEdge } from "@/utils/experiment/multiplayer/connectUtils";
import { generateEdgeId } from "@/utils/experiment/multiplayer/graphSync";
import type {
  YjsDoc,
  YNodesMap,
  YEdgesMap,
  NodesUpdater,
  EdgesUpdater,
  IsLockedForMe,
  GetLockOwner,
} from "@/types/multiplayer";
import React from "react";

/**
 * Manages connection handlers for creating edges between nodes.
 * Supports connecting from nodes to nodes, nodes to edges (for objections),
 * and handles anchor node creation for edge midpoint connections.
 *
 * @returns Connection handler functions (begin, complete, cancel)
 */
interface UseConnectionHandlersProps {
  nodes: Node[];
  edges: Edge[];
  yNodesMap: YNodesMap | null;
  yEdgesMap: YEdgesMap | null;
  ydoc: YjsDoc | null;
  canWrite: boolean;
  localOrigin: object;
  setNodes: NodesUpdater;
  setEdges: EdgesUpdater;
  connectMode: boolean;
  connectAnchorId: string | null;
  connectAnchorRef: React.MutableRefObject<string | null>;
  setConnectMode: (mode: boolean) => void;
  setConnectAnchorId: (id: string | null) => void;
  setConnectCursor: (cursor: { x: number; y: number } | null) => void;
  isLockedForMe?: IsLockedForMe;
  getLockOwner?: GetLockOwner;
  getNodeCenter: (nodeId: string) => { x: number; y: number } | null;
  getEdgeMidpoint: (edgeId: string) => { x: number; y: number } | null;
  getPreferredEdgeType?: () => "support" | "negation";
  currentUserId?: string | null;
  currentUsername?: string | null;
}

export const useConnectionHandlers = ({
  nodes,
  edges,
  yNodesMap,
  yEdgesMap,
  ydoc,
  canWrite,
  localOrigin,
  setNodes,
  setEdges,
  connectMode,
  connectAnchorId,
  connectAnchorRef,
  setConnectMode,
  setConnectAnchorId,
  setConnectCursor,
  isLockedForMe,
  getLockOwner,
  getNodeCenter,
  getEdgeMidpoint,
  getPreferredEdgeType,
  currentUserId,
  currentUsername,
}: UseConnectionHandlersProps) => {
  const beginConnectFromNode = useCallback(
    (id: string, cursor?: { x: number; y: number }) => {
      connectAnchorRef.current = id;
      setConnectAnchorId(id);
      const fallback = cursor || getNodeCenter(id);
      if (fallback) {
        setConnectCursor(fallback);
      }
    },
    [
      connectAnchorRef,
      setConnectAnchorId,
      setConnectCursor,
      getNodeCenter,
    ]
  );

  const beginConnectFromEdge = useCallback(
    (edgeId: string, cursor?: { x: number; y: number }) => {
      const anchorId = `anchor:${edgeId}`;
      connectAnchorRef.current = anchorId;
      setConnectAnchorId(anchorId);
      const midpoint = cursor || getEdgeMidpoint(edgeId);
      if (midpoint) {
        setConnectCursor(midpoint);
      }
      const edge = edges.find((e) => e.id === edgeId);
      if (edge) {
        const position = midpoint || getEdgeMidpoint(edgeId) || { x: 0, y: 0 };
        const anchorNode: Node = {
          id: anchorId,
          type: "edge_anchor",
          position,
          data: { parentEdgeId: edgeId },
        } as Node;
        setNodes((nds) =>
          nds.some((n) => n.id === anchorId) ? nds : [...nds, anchorNode]
        );
      }
    },
    [
      edges,
      connectAnchorRef,
      setConnectAnchorId,
      setConnectCursor,
      setNodes,
      getEdgeMidpoint,
    ]
  );

  const completeConnectToNode = useCallback(
    (nodeId: string) => {
      if (!connectMode) return;
      if (!canWrite) {
        showReadOnlyToast();
        return;
      }
      const anchorId = connectAnchorId || connectAnchorRef.current;
      if (!anchorId) return;
      if (nodeId === anchorId) {
        setConnectAnchorId(null);
        connectAnchorRef.current = null;
        setConnectCursor(null);
        return;
      }
      // Case: connecting FROM a node TO an anchor node
      if (nodeId.startsWith("anchor:")) {
        const edgeId = nodeId.slice("anchor:".length);
        const anchorIdForEdge = `anchor:${edgeId}`;
        const anchorNodeExists = nodes.some((n) => n.id === anchorIdForEdge);
        if (!anchorNodeExists) {
          const midpoint = getEdgeMidpoint(edgeId) || { x: 0, y: 0 };
          const anchorNode: Node = {
            id: anchorIdForEdge,
            type: "edge_anchor",
            position: midpoint,
            data: { parentEdgeId: edgeId },
          } as Node;
          setNodes((nds) =>
            nds.some((n) => n.id === anchorIdForEdge)
              ? nds
              : [...nds, anchorNode]
          );
        }
        const newEdge: Edge = {
          id: generateEdgeId(),
          type: "objection",
          source: anchorId,
          target: anchorIdForEdge,
          sourceHandle: `${anchorId}-source-handle`,
          targetHandle: `${anchorIdForEdge}-incoming-handle`,
          data: {
            createdBy: currentUserId || null,
            createdByName: currentUsername || null,
          },
        } as Edge;
        setEdges((eds) =>
          eds.some((e) => e.id === newEdge.id) ? eds : [...eds, newEdge]
        );
        if (yEdgesMap && ydoc && canWrite) {
          ydoc.transact(() => {
            if (!yEdgesMap.has(newEdge.id)) yEdgesMap.set(newEdge.id, newEdge);
          }, localOrigin);
        }
        setConnectAnchorId(null);
        connectAnchorRef.current = null;
        setConnectCursor(null);
        setConnectMode(false);
                return;
      }
      if (anchorId.startsWith("anchor:")) {
        const edgeId = anchorId.slice("anchor:".length);
        const anchorIdForEdge = `anchor:${edgeId}`;
        const anchorNodeExists = nodes.some((n) => n.id === anchorIdForEdge);
        if (!anchorNodeExists) {
          const midpoint = getEdgeMidpoint(edgeId) || { x: 0, y: 0 };
          const anchorNode: Node = {
            id: anchorIdForEdge,
            type: "edge_anchor",
            position: midpoint,
            data: { parentEdgeId: edgeId },
          } as Node;
          setNodes((nds) =>
            nds.some((n) => n.id === anchorIdForEdge)
              ? nds
              : [...nds, anchorNode]
          );
        }
        const newObjEdge: Edge = {
          id: generateEdgeId(),
          type: "objection",
          source: nodeId,
          target: anchorIdForEdge,
          sourceHandle: `${nodeId}-source-handle`,
          targetHandle: `${anchorIdForEdge}-incoming-handle`,
          data: {
            createdBy: currentUserId || null,
            createdByName: currentUsername || null,
          },
        } as Edge;
        setEdges((eds) =>
          eds.some((e) => e.id === newObjEdge.id) ? eds : [...eds, newObjEdge]
        );
        if (yEdgesMap && ydoc && canWrite) {
          ydoc.transact(() => {
            if (!yEdgesMap.has(newObjEdge.id))
              yEdgesMap.set(newObjEdge.id, newObjEdge);
          }, localOrigin);
        }
        setConnectAnchorId(null);
        connectAnchorRef.current = null;
        setConnectCursor(null);
        setConnectMode(false);
                return;
      }
      const parentId = anchorId;
      const childId = nodeId;
      if (isLockedForMe?.(parentId) || isLockedForMe?.(childId)) {
        const lockedNodeId = isLockedForMe?.(parentId) ? parentId : childId;
        const owner = getLockOwner?.(lockedNodeId);
        toast.warning(`Locked by ${owner?.name || "another user"}`);
        setConnectAnchorId(null);
        connectAnchorRef.current = null;
        setConnectCursor(null);
        return;
      }
      const preferred = getPreferredEdgeType?.();
      const { id, edge } = buildConnectionEdge(
        nodes,
        parentId,
        childId,
        preferred,
        { userId: currentUserId || null, username: currentUsername || null }
      );
      const pairExists = edges.some(
        (e) =>
          ((e.source === childId && e.target === parentId) ||
            (e.source === parentId && e.target === childId)) &&
          (e.type === "support" ||
            e.type === "negation" ||
            e.type === "option" ||
            e.type === "comment")
      );
      if (pairExists) {
        try { toast.warning?.("Cannot add duplicate edge"); } catch {}
        return;
      }
      const exists = edges.some((e) => e.id === id);
      if (!exists) {
        setEdges((eds) =>
          eds.some((e) => e.id === id) ? eds : [...eds, edge]
        );
      }
      if (yEdgesMap && ydoc && canWrite) {
        ydoc.transact(() => {
          if (!yEdgesMap.has(id)) yEdgesMap.set(id, edge);
        }, localOrigin);
      }
      setConnectAnchorId(null);
      connectAnchorRef.current = null;
      setConnectCursor(null);
          },
    [
      connectMode,
      canWrite,
      connectAnchorId,
      connectAnchorRef,
      nodes,
      edges,
      yEdgesMap,
      ydoc,
      localOrigin,
      setNodes,
      setEdges,
      setConnectAnchorId,
      setConnectCursor,
      setConnectMode,
      isLockedForMe,
      getLockOwner,
      getEdgeMidpoint,
      getPreferredEdgeType,
      currentUserId,
      currentUsername,
          ]
  );

  const cancelConnect = useCallback(() => {
    setConnectAnchorId(null);
    connectAnchorRef.current = null;
    setConnectCursor(null);
    setConnectMode(false);
      }, [
    setConnectAnchorId,
    connectAnchorRef,
    setConnectCursor,
    setConnectMode,
      ]);

  const completeConnectToEdge = useCallback(
    (edgeId: string, midX?: number, midY?: number) => {
      if (!connectMode) return;
      const origin = connectAnchorRef.current;
      if (!origin) return;
      if (origin.startsWith("anchor:")) {
        return;
      }
      const originNode = nodes.find((n) => n.id === origin);
      if (originNode) {
        const anchorId = `anchor:${edgeId}`;
        const anchorExists = nodes.some((n) => n.id === anchorId);
        if (!anchorExists) {
          const midpoint = getEdgeMidpoint(edgeId) || {
            x: midX ?? 0,
            y: midY ?? 0,
          };
          const anchorNode: Node = {
            id: anchorId,
            type: "edge_anchor",
            position: midpoint,
            data: { parentEdgeId: edgeId },
          } as Node;
          setNodes((nds) =>
            nds.some((n) => n.id === anchorId) ? nds : [...nds, anchorNode]
          );
        }
        const newEdge: Edge = {
          id: generateEdgeId(),
          type: "objection",
          source: originNode.id,
          target: `anchor:${edgeId}`,
          sourceHandle: `${originNode.id}-source-handle`,
          targetHandle: `anchor:${edgeId}-incoming-handle`,
          data: {
            createdBy: currentUserId || null,
            createdByName: currentUsername || null,
          },
        } as Edge;
        setEdges((eds) =>
          eds.some((e) => e.id === newEdge.id) ? eds : [...eds, newEdge]
        );
        if (yEdgesMap && ydoc && canWrite) {
          ydoc.transact(() => {
            if (!yEdgesMap.has(newEdge.id)) yEdgesMap.set(newEdge.id, newEdge);
          }, localOrigin);
        }
      }
      setConnectAnchorId(null);
      connectAnchorRef.current = null;
      setConnectCursor(null);
          },
    [
      connectMode,
      connectAnchorRef,
      nodes,
      yEdgesMap,
      ydoc,
      canWrite,
      localOrigin,
      setNodes,
      setEdges,
      setConnectAnchorId,
      setConnectCursor,
      getEdgeMidpoint,
      currentUserId,
      currentUsername,
          ]
  );

  return {
    beginConnectFromNode,
    beginConnectFromEdge,
    completeConnectToNode,
    completeConnectToEdge,
    cancelConnect,
  };
};
