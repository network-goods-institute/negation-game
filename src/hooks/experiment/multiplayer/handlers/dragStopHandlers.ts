import type { MutableRefObject } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import {
  calculateSnapPositions,
  filterSnapTargets,
  filterSnapTargetsMulti,
  calculateGroupSnapPositions,
  calculateGroupBounds,
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
    const cleanup = () => {
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

    try {
      const isPrimaryNode = node.id === dragStateRef.current.nodeId;
      const ctrlPressed = e?.ctrlKey || e?.nativeEvent?.ctrlKey || false;
      // Refresh selection snapshot in case selection changed (e.g., marquee select)
      if (!dragStateRef.current.selectedNodeIds?.length) {
        const currentSelected = rf.getNodes().filter((n: any) => n.selected);
        dragStateRef.current.selectedNodeIds = currentSelected.map((n: any) => n.id);
        dragStateRef.current.initialPositionsById = currentSelected.reduce<
          Record<string, { x: number; y: number }>
        >((acc, n: any) => {
          acc[n.id] = { x: n.position?.x ?? 0, y: n.position?.y ?? 0 };
          return acc;
        }, {});
        dragStateRef.current.initialSizesById = currentSelected.reduce<
          Record<string, { width: number; height: number }>
        >((acc, n: any) => {
          const width =
            Number(n?.width ?? n?.measured?.width ?? n?.style?.width ?? 0) || 0;
          const height =
            Number(n?.height ?? n?.measured?.height ?? n?.style?.height ?? 0) || 0;
          acc[n.id] = { width: Math.round(width), height: Math.round(height) };
          return acc;
        }, {});
        dragStateRef.current.initialGroupBounds =
          currentSelected.length > 1
            ? calculateGroupBounds(
                currentSelected as any,
                dragStateRef.current.initialSizesById
              )
            : null;
      }
      const isMultiSelect = dragStateRef.current.selectedNodeIds.length > 1;

      if (isPrimaryNode && isMultiSelect) {
        const allNodes = rf.getNodes();

        if (dragStateRef.current.initialGroupBounds) {
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
          const { snapX, snapY } = ctrlPressed
            ? { snapX: null, snapY: null }
            : calculateGroupSnapPositions(
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
                cleanup();
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
              cleanup();
            });
          });
        } else {
          // Fallback: handle ctrl-pressed bypass or multi-select without group bounds
          dragStateRef.current.finalizingSnap = true;

          if (!ctrlPressed && isMultiSelect) {
            // Multi-select without ctrl: update all selected nodes
            const leaderInitial = dragStateRef.current.initialPositionsById[
              dragStateRef.current.nodeId || ""
            ] || {
              x: node.position?.x ?? 0,
              y: node.position?.y ?? 0,
            };
            const dx = (node.position?.x ?? 0) - leaderInitial.x;
            const dy = (node.position?.y ?? 0) - leaderInitial.y;

            const positionsById = dragStateRef.current.selectedNodeIds.reduce<
              Record<string, { x: number; y: number }>
            >((acc, id) => {
              const init = dragStateRef.current.initialPositionsById[id] || {
                x: 0,
                y: 0,
              };
              acc[id] = { x: init.x + dx, y: init.y + dy };
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
                  cleanup();
                });
              });
            });
          } else {
            // Ctrl pressed: just clean up
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                dragStateRef.current.finalizingSnap = false;
                cleanup();
              });
            });
          }
        }

        // Defer cleanup to the requestAnimationFrame chain above
        return;
      } else if (isPrimaryNode && !isMultiSelect && !ctrlPressed) {
        const allNodes = rf.getNodes();

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
            cleanup();
          });
        });
      }
    } catch {}

    cleanup();
  };
}
