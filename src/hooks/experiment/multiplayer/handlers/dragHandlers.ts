import type { MutableRefObject } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import {
  calculateSnapPositions,
  filterSnapTargets,
  filterSnapTargetsMulti,
  calculateGroupSnapPositions,
} from "@/lib/canvas/snapCalculations";
import type { SnapResult } from "../useNodeDragSnapping";
import { logger } from "@/lib/logger";

type GraphApi = {
  updateNodePosition?: (id: string, x: number, y: number) => void;
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
};

export function createHandleNodeDrag({
  graph,
  rf,
  viewport,
  altCloneMapRef,
  setSnapResult,
  dragStateRef,
}: {
  graph: GraphApi;
  rf: ReactFlowInstance;
  viewport: { zoom?: number };
  altCloneMapRef: MutableRefObject<
    Map<string, { dupId: string; origin: { x: number; y: number } }>
  >;
  setSnapResult: (v: SnapResult | null) => void;
  dragStateRef: MutableRefObject<DragState>;
}) {
  return (e: any, node: any) => {
    try {
      const mapping = altCloneMapRef.current.get(String(node.id));
      if (mapping) {
        graph.updateNodePosition?.(
          mapping.dupId,
          node.position?.x ?? 0,
          node.position?.y ?? 0
        );
        graph.updateNodePosition?.(node.id, mapping.origin.x, mapping.origin.y);
        return;
      }

      const ctrlPressed = e?.ctrlKey || e?.nativeEvent?.ctrlKey || false;
      const isMultiSelect = dragStateRef.current.selectedNodeIds.length > 1;
      const isPrimaryNode = node.id === dragStateRef.current.nodeId;

      if (!isPrimaryNode) {
        return;
      }

      dragStateRef.current.position = node.position;

      if (dragStateRef.current.rafId) {
        cancelAnimationFrame(dragStateRef.current.rafId);
        dragStateRef.current.rafId = null;
      }

      const leaderInitial = dragStateRef.current.initialPositionsById[
        dragStateRef.current.nodeId || ""
      ] || {
        x: node.position?.x ?? 0,
        y: node.position?.y ?? 0,
      };
      const dx = (node.position?.x ?? 0) - leaderInitial.x;
      const dy = (node.position?.y ?? 0) - leaderInitial.y;

      const allNodes = rf.getNodes();

      if (
        !ctrlPressed &&
        isMultiSelect &&
        dragStateRef.current.initialGroupBounds
      ) {
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
        const { snapX, snapY, snapLineX, snapLineY } =
          calculateGroupSnapPositions(
            adjustedGroupBounds,
            otherNodes as any,
            viewport.zoom || 1
          );

        const offsetX = snapX !== null ? snapX - adjustedGroupBounds.left : 0;
        const offsetY = snapY !== null ? snapY - adjustedGroupBounds.top : 0;

        const finalLeaderX = leaderInitial.x + dx + offsetX;
        const finalLeaderY = leaderInitial.y + dy + offsetY;

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

        dragStateRef.current.rafId = requestAnimationFrame(() => {
          for (const id of dragStateRef.current.selectedNodeIds) {
            const p = positionsById[id];
            graph.updateNodePosition?.(id, p.x, p.y);
          }
          setSnapResult({
            x: finalLeaderX,
            y: finalLeaderY,
            snappedX: snapX !== null,
            snappedY: snapY !== null,
            snapLineX,
            snapLineY,
          });
        });
      } else if (!ctrlPressed && !isMultiSelect) {
        if (!node.position) {
          dragStateRef.current.rafId = requestAnimationFrame(() => {
            graph.updateNodePosition?.(node.id, 0, 0);
            setSnapResult(null);
          });
        } else {
          const otherNodes = filterSnapTargets(
            allNodes,
            dragStateRef.current.nodeId || node.id
          );
          const { snapX, snapY, snapLineX, snapLineY } = calculateSnapPositions(
            node as any,
            node.position,
            otherNodes as any,
            viewport.zoom || 1,
            dragStateRef.current.initialSizesById
          );

          const finalX = snapX !== null ? snapX : (node.position?.x ?? 0);
          const finalY = snapY !== null ? snapY : (node.position?.y ?? 0);

          dragStateRef.current.rafId = requestAnimationFrame(() => {
            graph.updateNodePosition?.(node.id, finalX, finalY);
            setSnapResult({
              x: finalX,
              y: finalY,
              snappedX: snapX !== null,
              snappedY: snapY !== null,
              snapLineX,
              snapLineY,
            });
          });
        }
      } else {
        // Fallback: handle ctrl-pressed bypass or multi-select without group bounds
        dragStateRef.current.rafId = requestAnimationFrame(() => {
          if (!ctrlPressed && isMultiSelect && dragStateRef.current.selectedNodeIds.length > 0) {
            // Multi-select fallback without ctrl: update all selected nodes based on the leader's movement
            const leaderInitial = dragStateRef.current.initialPositionsById[
              dragStateRef.current.nodeId || ""
            ] || {
              x: node.position?.x ?? 0,
              y: node.position?.y ?? 0,
            };
            const dx = (node.position?.x ?? 0) - leaderInitial.x;
            const dy = (node.position?.y ?? 0) - leaderInitial.y;

            for (const id of dragStateRef.current.selectedNodeIds) {
              const init = dragStateRef.current.initialPositionsById[id] || {
                x: 0,
                y: 0,
              };
              graph.updateNodePosition?.(id, init.x + dx, init.y + dy);
            }
          } else {
            // Ctrl pressed or single node: only update the dragged node
            graph.updateNodePosition?.(
              node.id,
              node.position?.x ?? 0,
              node.position?.y ?? 0
            );
          }
          setSnapResult(null);
        });
      }
    } catch (error) {
      logger.log("[handleNodeDrag] Error:", error);
    }
  };
}
