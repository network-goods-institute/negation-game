import React from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { toast } from "sonner";
import { calculateGroupBounds } from "@/lib/canvas/snapCalculations";
import { createHandleNodeDrag } from "./handlers/dragHandlers";
import { createHandleNodeDragStop } from "./handlers/dragStopHandlers";
import type { SnapResult } from "./useNodeDragSnapping";

interface UseGraphNodeHandlersProps {
  graph: any;
  grabMode?: boolean;
  selectMode: boolean;
  onNodeClick?: (e: any, node: any) => void;
  onNodeDragStart?: (e: any, node: any) => void;
  onNodeDragStop?: (e: any, node: any) => void;
  altCloneMapRef: React.MutableRefObject<
    Map<string, { dupId: string; origin: { x: number; y: number } }>
  >;
}

export const useGraphNodeHandlers = ({
  graph,
  grabMode,
  selectMode,
  onNodeClick,
  onNodeDragStart,
  onNodeDragStop,
  altCloneMapRef,
}: UseGraphNodeHandlersProps) => {
  const rf = useReactFlow();
  const viewport = useViewport();
  const dragStateRef = React.useRef<{
    nodeId: string | null;
    position: { x: number; y: number } | null;
    selectedNodeIds: string[];
    initialPositionsById: Record<string, { x: number; y: number }>;
    initialSizesById: Record<string, { width: number; height: number }>;
    initialGroupBounds: {
      left: number;
      right: number;
      top: number;
      bottom: number;
      centerX: number;
      centerY: number;
      width: number;
      height: number;
    } | null;
    rafId: number | null;
    finalizingSnap: boolean;
  }>({
    nodeId: null,
    position: null,
    selectedNodeIds: [],
    initialGroupBounds: null,
    initialPositionsById: {},
    initialSizesById: {},
    rafId: null,
    finalizingSnap: false,
  });
  const [snapResult, setSnapResult] = React.useState<SnapResult | null>(null);

  const handleNodeClick = React.useCallback(
    (e: any, node: any) => {
      if (grabMode) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.shiftKey && selectMode) {
        e.preventDefault();
        e.stopPropagation();

        const currentNodes = rf.getNodes();
        const currentNode = currentNodes.find((n: any) => n.id === node.id);

        if (currentNode) {
          const updatedNodes = currentNodes.map((n: any) =>
            n.id === node.id ? { ...n, selected: !n.selected } : n
          );
          rf.setNodes(updatedNodes);
        }
        return;
      }

      onNodeClick?.(e, node);
    },
    [grabMode, selectMode, rf, onNodeClick]
  );

  const handleNodeDragStart = React.useCallback(
    (e: any, node: any) => {
      dragStateRef.current.nodeId = node.id;
      dragStateRef.current.position = node.position;

      const allNodes = rf.getNodes();
      const selectedNodes = allNodes.filter((n: any) => n.selected);
      dragStateRef.current.selectedNodeIds = selectedNodes.map(
        (n: any) => n.id
      );
      dragStateRef.current.initialPositionsById = selectedNodes.reduce<
        Record<string, { x: number; y: number }>
      >((acc, n: any) => {
        acc[n.id] = { x: n.position?.x ?? 0, y: n.position?.y ?? 0 };
        return acc;
      }, {});
      dragStateRef.current.initialSizesById = selectedNodes.reduce<
        Record<string, { width: number; height: number }>
      >((acc, n: any) => {
        const width =
          Number(n?.width ?? n?.measured?.width ?? n?.style?.width ?? 0) || 0;
        const height =
          Number(n?.height ?? n?.measured?.height ?? n?.style?.height ?? 0) ||
          0;
        acc[n.id] = { width: Math.round(width), height: Math.round(height) };
        return acc;
      }, {});

      if (selectedNodes.length > 1) {
        dragStateRef.current.initialGroupBounds = calculateGroupBounds(
          selectedNodes as any,
          dragStateRef.current.initialSizesById
        );
      } else {
        dragStateRef.current.initialGroupBounds = null;
      }

      if (dragStateRef.current.rafId) {
        cancelAnimationFrame(dragStateRef.current.rafId);
        dragStateRef.current.rafId = null;
      }
      setSnapResult(null);
      onNodeDragStart?.(e, node);
      try {
        // Block dragging a node if any objection connected to an edge with this node as endpoint is being edited
        try {
          const edgesAll = rf.getEdges();
          const nodesAll = rf.getNodes();
          const relatedObjections = nodesAll.filter(
            (n: any) => n.type === "objection" && n.data?.parentEdgeId
          );
          for (const obj of relatedObjections) {
            const base = edgesAll.find(
              (ed: any) => ed.id === obj.data.parentEdgeId
            );
            if (!base) continue;
            const isEndpoint =
              String(base.source) === node.id ||
              String(base.target) === node.id;
            if (!isEndpoint) continue;
            const editors = graph?.getEditorsForNode?.(obj.id) || [];
            if (editors.length > 0) {
              e?.preventDefault?.();
              e?.stopPropagation?.();
              toast.warning(`Locked by ${editors[0]?.name || "another user"}`);
              return;
            }
          }
        } catch {}

        if ((node as any)?.type === "objection") {
          const allEdges = rf.getEdges();
          const objEdge = allEdges.find(
            (ed: any) =>
              (ed.type || "") === "objection" && ed.source === node.id
          );
          if (objEdge) {
            const anchorId = String(objEdge.target || "");
            const anchor: any = rf.getNode(anchorId);
            if (anchor && anchor.type === "edge_anchor") {
              const parentEdgeId: string | undefined =
                anchor.data?.parentEdgeId;
              if (parentEdgeId) {
                graph.ensureEdgeAnchor?.(
                  anchor.id,
                  parentEdgeId,
                  anchor.position?.x ?? 0,
                  anchor.position?.y ?? 0
                );
              }
            } else {
              // Anchor not in local RF yet; derive parent edge id from target and ensure presence using midpoint
              const parentEdgeId = anchorId.startsWith("anchor:")
                ? anchorId.slice("anchor:".length)
                : null;
              if (parentEdgeId) {
                const base = allEdges.find((e: any) => e.id === parentEdgeId);
                if (base) {
                  const src = rf.getNode(String(base.source));
                  const tgt = rf.getNode(String(base.target));
                  const midX =
                    (((src as any)?.position?.x ?? 0) +
                      ((tgt as any)?.position?.x ?? 0)) /
                    2;
                  const midY =
                    (((src as any)?.position?.y ?? 0) +
                      ((tgt as any)?.position?.y ?? 0)) /
                    2;
                  graph.ensureEdgeAnchor?.(anchorId, parentEdgeId, midX, midY);
                }
              }
            }
          }
        }
      } catch {}

      // Option/Alt-drag to duplicate: create duplicate at start and route movement to it
      try {
        if (
          (e?.altKey || e?.nativeEvent?.altKey) &&
          String(node?.type) !== "edge_anchor"
        ) {
          const originX = node?.position?.x ?? 0;
          const originY = node?.position?.y ?? 0;
          const flowPos = rf.screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
          });
          const dx = flowPos.x - originX;
          const dy = flowPos.y - originY;
          const dupId = graph?.duplicateNodeWithConnections?.(node.id, {
            x: dx,
            y: dy,
          });
          if (dupId) {
            altCloneMapRef.current.set(String(node.id), {
              dupId: String(dupId),
              origin: { x: originX, y: originY },
            });
            try {
              graph?.unlockNode?.(node.id);
            } catch {}
            try {
              graph?.lockNode?.(String(dupId), "drag");
            } catch {}
          }
        }
      } catch {}
    },
    [rf, graph, onNodeDragStart, altCloneMapRef]
  );

  const handleNodeDrag = React.useCallback(
    (e: any, node: any) => {
      return createHandleNodeDrag({
        graph,
        rf,
        viewport,
        altCloneMapRef,
        setSnapResult,
        dragStateRef,
      })(e, node);
    },
    [graph, rf, viewport, altCloneMapRef, setSnapResult, dragStateRef]
  );

  const handleNodeDragStop = React.useCallback(
    (e: any, node: any) => {
      return createHandleNodeDragStop({
        graph,
        rf,
        viewport,
        altCloneMapRef,
        dragStateRef,
        setSnapResult,
        onNodeDragStop,
      })(e, node);
    },
    [
      graph,
      rf,
      viewport,
      altCloneMapRef,
      dragStateRef,
      setSnapResult,
      onNodeDragStop,
    ]
  );

  return {
    handleNodeClick,
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop,
    snapResult,
    get finalizingSnap() {
      return dragStateRef.current.finalizingSnap;
    },
    get draggingActive() {
      return dragStateRef.current.nodeId !== null;
    },
  };
};
