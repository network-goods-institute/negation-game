import { useMemo, useCallback } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";

interface UseNodeDragSnappingProps {
  draggedNodeId: string | null;
  draggedPosition: { x: number; y: number } | null;
  enabled?: boolean;
}

interface SnapResult {
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

    const thresholdPx = 32;
    const thresholdFlow = thresholdPx / (viewport.zoom || 1);

    const otherNodes = allNodes.filter(
      (n: any) => n.id !== draggedNodeId && n.type !== "edge_anchor"
    );

    let snapX: number | null = null;
    let snapY: number | null = null;
    let snapLineX: number | null = null;
    let snapLineY: number | null = null;
    let minXDist = Infinity;
    let minYDist = Infinity;

    const draggedCenterX = draggedPosition.x + ((draggedNode.width || 0) / 2);
    const draggedCenterY = draggedPosition.y + ((draggedNode.height || 0) / 2);

    for (const otherNode of otherNodes) {
      const otherCenterX = otherNode.position.x + ((otherNode.width || 0) / 2);
      const otherCenterY = otherNode.position.y + ((otherNode.height || 0) / 2);

      const xDist = Math.abs(draggedCenterX - otherCenterX);
      if (xDist < minXDist && xDist <= thresholdFlow) {
        minXDist = xDist;
        snapX = otherCenterX - ((draggedNode.width || 0) / 2);
        snapLineX = otherCenterX;
      }

      const yDist = Math.abs(draggedCenterY - otherCenterY);
      if (yDist < minYDist && yDist <= thresholdFlow) {
        minYDist = yDist;
        snapY = otherCenterY - ((draggedNode.height || 0) / 2);
        snapLineY = otherCenterY;
      }

      const otherLeftX = otherNode.position.x;
      const draggedLeftX = draggedPosition.x;
      const leftXDist = Math.abs(draggedLeftX - otherLeftX);
      if (leftXDist < minXDist && leftXDist <= thresholdFlow) {
        minXDist = leftXDist;
        snapX = otherLeftX;
        snapLineX = otherLeftX;
      }

      const otherRightX = otherNode.position.x + (otherNode.width || 0);
      const draggedRightX = draggedPosition.x + (draggedNode.width || 0);
      const rightXDist = Math.abs(draggedRightX - otherRightX);
      if (rightXDist < minXDist && rightXDist <= thresholdFlow) {
        minXDist = rightXDist;
        snapX = draggedPosition.x + (otherRightX - draggedRightX);
        snapLineX = otherRightX;
      }

      const otherTopY = otherNode.position.y;
      const draggedTopY = draggedPosition.y;
      const topYDist = Math.abs(draggedTopY - otherTopY);
      if (topYDist < minYDist && topYDist <= thresholdFlow) {
        minYDist = topYDist;
        snapY = otherTopY;
        snapLineY = otherTopY;
      }

      const otherBottomY = otherNode.position.y + (otherNode.height || 0);
      const draggedBottomY = draggedPosition.y + (draggedNode.height || 0);
      const bottomYDist = Math.abs(draggedBottomY - otherBottomY);
      if (bottomYDist < minYDist && bottomYDist <= thresholdFlow) {
        minYDist = bottomYDist;
        snapY = draggedPosition.y + (otherBottomY - draggedBottomY);
        snapLineY = otherBottomY;
      }
    }

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
