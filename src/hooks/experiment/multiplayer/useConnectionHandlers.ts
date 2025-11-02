import { useCallback } from "react";
import { toast } from "sonner";
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
  mindchangeSelectMode?: boolean;
  setSelectedEdgeId?: (edgeId: string | null) => void;
  mindchangeEdgeId?: string | null;
  setMindchangeNextDir?: (dir: "forward" | "backward" | null) => void;
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
  mindchangeSelectMode,
  setSelectedEdgeId,
  mindchangeEdgeId,
  setMindchangeNextDir,
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
      if (!(connectMode || mindchangeSelectMode)) return;
      if (!canWrite && !mindchangeSelectMode) {
        toast.warning("Read-only mode: Changes won't be saved");
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
      // Mindchange selection mode: user clicks the point that changes their mind; target is the other endpoint of the selected edge
      if (mindchangeSelectMode) {
        // If Mindchange was initiated from a specific edge, honor it
        const selectedEdge = mindchangeEdgeId
          ? edges.find((e) => e.id === mindchangeEdgeId)
          : null;
        if (selectedEdge) {
          // For all edge types (including objection), determine direction by which endpoint user clicked
          const dir =
            nodeId === selectedEdge.source
              ? "forward"
              : nodeId === selectedEdge.target
                ? "backward"
                : null;
          if (dir) {
            setSelectedEdgeId?.(selectedEdge.id);
            setMindchangeNextDir?.(dir);
          } else {
            // For objection edges, user must click the objection node or the base edge (not nodes)
            if (selectedEdge.type === "objection") {
              toast.info(
                "Click either the mitigation point or the relation line being mitigated"
              );
            } else {
              toast.info(
                "Click one of the two points connected by this relation"
              );
            }
          }
        } else {
          // Fallback: infer chosen edge between clicked node and anchor parent, prefer support/negation
          const parentId = anchorId;
          const childId = nodeId;
          const candidates = edges.filter(
            (e) =>
              (e.type === "support" ||
                e.type === "negation" ||
                e.type === "option") &&
              ((e.source === childId && e.target === parentId) ||
                (e.source === parentId && e.target === childId))
          );
          const chosen =
            candidates.find((e) => e.type === "support") ||
            candidates.find((e) => e.type === "negation") ||
            candidates[0];
          if (chosen) {
            const dir =
              childId === chosen.source
                ? "forward"
                : childId === chosen.target
                  ? "backward"
                  : "forward";
            setSelectedEdgeId?.(chosen.id);
            setMindchangeNextDir?.(dir);
          } else {
            toast.info("No edge between selected points");
          }
        }
        setConnectAnchorId(null);
        connectAnchorRef.current = null;
        setConnectCursor(null);
        // Keep connect mode off; remain in mindchange mode so the editor can open
        setConnectMode(false);
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
      if (anchorId.startsWith("anchor:") && !mindchangeSelectMode) {
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
      if (mindchangeSelectMode) {
        const isBase = (t: string | undefined) =>
          t === "support" || t === "negation" || t === "option";
        const candidates = edges.filter(
          (e) =>
            isBase(e.type as any) &&
            ((e.source === childId && e.target === parentId) ||
              (e.source === parentId && e.target === childId))
        );
        const chosen =
          // Prefer match in the same direction as the selection
          candidates.find(
            (e) => e.source === childId && e.target === parentId
          ) ||
          // Then prefer primary base types
          candidates.find((e) => e.type === "support") ||
          candidates.find((e) => e.type === "negation") ||
          candidates[0];
        if (!chosen) {
          toast.info("No edge between selected points");
        } else {
          setSelectedEdgeId?.(chosen.id || null);
        }
      } else {
        const preferred = getPreferredEdgeType?.();
        const { id, edge } = buildConnectionEdge(
          nodes,
          parentId,
          childId,
          preferred
        );
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
      mindchangeSelectMode,
      setSelectedEdgeId,
      mindchangeEdgeId,
      setMindchangeNextDir,
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
