import { useMemo } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { calculateSnapPositions, filterSnapTargets } from "@/lib/canvas/snapCalculations";

interface UseNodeDragSnappingProps {
  draggedNodeId: string | null;
  draggedPosition: { x: number; y: number } | null;
  enabled?: boolean;
}

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
  snapLineX: number | null;
  snapLineY: number | null;
}

export const useNodeDragSnapping = ({
  draggedNodeId,
  draggedPosition,
  enabled = true,
}: UseNodeDragSnappingProps): SnapResult | null => {
  const rf = useReactFlow();
  const viewport = useViewport();

  const snapResult = useMemo((): SnapResult | null => {
    if (!enabled || !draggedNodeId || !draggedPosition) {
      return null;
    }

    const allNodes = rf.getNodes();
    const draggedNode = allNodes.find((n: any) => n.id === draggedNodeId);

    if (!draggedNode) {
      return null;
    }

    const otherNodes = filterSnapTargets(allNodes, draggedNodeId);
    const { snapX, snapY, snapLineX, snapLineY } = calculateSnapPositions(
      draggedNode,
      draggedPosition,
      otherNodes,
      viewport.zoom || 1
    );

    return {
      x: snapX !== null ? snapX : draggedPosition.x,
      y: snapY !== null ? snapY : draggedPosition.y,
      snappedX: snapX !== null,
      snappedY: snapY !== null,
      snapLineX,
      snapLineY,
    };
  }, [enabled, draggedNodeId, draggedPosition, rf, viewport.zoom]);

  return snapResult;
};
