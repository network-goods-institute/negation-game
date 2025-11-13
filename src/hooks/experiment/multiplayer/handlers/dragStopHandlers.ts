import type { MutableRefObject } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import {
  calculateSnapPositions,
  filterSnapTargets,
  filterSnapTargetsMulti,
  calculateGroupSnapPositions,
} from "@/lib/canvas/snapCalculations";
import type { SnapResult } from "../useNodeDragSnapping";

type GraphApi = {
  updateNodePosition?: (id: string, x: number, y: number) => void;
  stopCapturing?: () => void;
  unlockNode?: (id: string) => void;
};

type DragState = {
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
};

export function createHandleNodeDragStop({
  graph,
  rf,
  viewport,
  altCloneMapRef,
  dragStateRef,
  setSnapResult,
  onNodeDragStop,
}: {
  graph: GraphApi;
  rf: ReactFlowInstance;
  viewport: { zoom?: number };
  altCloneMapRef: MutableRefObject<
    Map<string, { dupId: string; origin: { x: number; y: number } }>
  >;
  dragStateRef: MutableRefObject<DragState>;
  setSnapResult: (v: SnapResult | null) => void;
  onNodeDragStop?: (e: any, node: any) => void;
}) {
  return (e: any, node: any) => {
    try {
      const isPrimaryNode = node.id === dragStateRef.current.nodeId;
      const ctrlPressed = e?.ctrlKey || e?.nativeEvent?.ctrlKey || false;
      const isMultiSelect = dragStateRef.current.selectedNodeIds.length > 1;

      if (isPrimaryNode && !ctrlPressed) {
        const allNodes = rf.getNodes();

        if (isMultiSelect && dragStateRef.current.initialGroupBounds) {
          dragStateRef.current.finalizingSnap = true;
          const leaderInitial = dragStateRef.current.initialPositionsById[
            dragStateRef.current.nodeId || ""
          ] || {
            x: node.position?.x ?? 0,
            y: node.position?.y ?? 0,
          };
          const dx = (node.position?.x ?? 0) - leaderInitial.x;
          const dy = (node.position?.y ?? 0) - leaderInitial.y;

          const adjustedGroupBounds = {
            left: dragStateRef.current.initialGroupBounds.left + dx,
            right: dragStateRef.current.initialGroupBounds.right + dx,
            top: dragStateRef.current.initialGroupBounds.top + dy,
            bottom: dragStateRef.current.initialGroupBounds.bottom + dy,
            centerX: dragStateRef.current.initialGroupBounds.centerX + dx,
            centerY: dragStateRef.current.initialGroupBounds.centerY + dy,
            width: dragStateRef.current.initialGroupBounds.width,
            height: dragStateRef.current.initialGroupBounds.height,
          };

          const otherNodes = filterSnapTargetsMulti(
            allNodes,
            dragStateRef.current.selectedNodeIds
          );
          const { snapX, snapY } = calculateGroupSnapPositions(
            adjustedGroupBounds,
            otherNodes as any,
            viewport.zoom || 1
          );

          const offsetX = snapX !== null ? snapX - adjustedGroupBounds.left : 0;
          const offsetY = snapY !== null ? snapY - adjustedGroupBounds.top : 0;

          const positionsById = dragStateRef.current.selectedNodeIds.reduce<
            Record<string, { x: number; y: number }>
          >((acc, id) => {
            const init = dragStateRef.current.initialPositionsById[id] || {
              x: 0,
              y: 0,
            };
            acc[id] = { x: init.x + dx + offsetX, y: init.y + dy + offsetY };
            return acc;
          }, {});

          const ids = Object.keys(positionsById);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              for (const id of ids) {
                const p = positionsById[id];
                graph.updateNodePosition?.(id, p.x, p.y);
              }
              requestAnimationFrame(() => {
                dragStateRef.current.finalizingSnap = false;
              });
            });
          });
        } else if (!isMultiSelect) {
          dragStateRef.current.finalizingSnap = true;
          const otherNodes = filterSnapTargets(
            allNodes,
            dragStateRef.current.nodeId || node.id
          );
          const { snapX, snapY } = calculateSnapPositions(
            node as any,
            node.position ?? { x: 0, y: 0 },
            otherNodes as any,
            viewport.zoom || 1,
            dragStateRef.current.initialSizesById
          );

          const finalX = snapX !== null ? snapX : (node.position?.x ?? 0);
          const finalY = snapY !== null ? snapY : (node.position?.y ?? 0);

          requestAnimationFrame(() => {
            graph.updateNodePosition?.(node.id, finalX, finalY);
            requestAnimationFrame(() => {
              dragStateRef.current.finalizingSnap = false;
            });
          });
        }
      }
    } catch {}

    dragStateRef.current.nodeId = null;
    dragStateRef.current.position = null;
    dragStateRef.current.selectedNodeIds = [];
    dragStateRef.current.initialGroupBounds = null;
    dragStateRef.current.initialPositionsById = {};
    dragStateRef.current.initialSizesById = {};
    if (dragStateRef.current.rafId) {
      cancelAnimationFrame(dragStateRef.current.rafId);
      dragStateRef.current.rafId = null;
    }
    setSnapResult(null);
    onNodeDragStop?.(e, node);
    graph?.stopCapturing?.();
    const mapping = altCloneMapRef.current.get(String(node.id));
    if (mapping) {
      graph?.unlockNode?.(mapping.dupId);
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      altCloneMapRef.current.delete(String(node.id));
    }
  };
}
