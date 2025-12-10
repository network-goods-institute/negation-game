import { useCallback } from "react";
import { Node, Edge, getBezierPath, Position } from "@xyflow/react";
import { computeMidpointBetweenBorders } from "@/utils/experiment/multiplayer/edgePathUtils";

interface UseNodeHelpersProps {
  nodes: Node[];
  edges: Edge[];
}

const getNodeDimension = (
  node: Node,
  dimension: "width" | "height"
): number => {
  const measured = node.measured as
    | { width?: number; height?: number }
    | undefined;
  const style = node.style as { width?: number; height?: number } | undefined;

  if (typeof (node as any)[dimension] === "number")
    return (node as any)[dimension];
  if (typeof measured?.[dimension] === "number") return measured[dimension];
  if (typeof style?.[dimension] === "number") return style[dimension];
  return 0;
};

const getHandlePosition = (
  node: Node,
  position: Position
): { x: number; y: number } | null => {
  const width = getNodeDimension(node, "width");
  const height = getNodeDimension(node, "height");
  const base = (node as any).position || { x: 0, y: 0 };
  const x0 = typeof base.x === "number" ? base.x : 0;
  const y0 = typeof base.y === "number" ? base.y : 0;

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  switch (position) {
    case Position.Top:
      return { x: x0 + width / 2, y: y0 };
    case Position.Bottom:
      return { x: x0 + width / 2, y: y0 + height };
    case Position.Left:
      return { x: x0, y: y0 + height / 2 };
    case Position.Right:
      return { x: x0 + width, y: y0 + height / 2 };
    default:
      return { x: x0 + width / 2, y: y0 + height / 2 };
  }
};

export const useNodeHelpers = ({ nodes, edges }: UseNodeHelpersProps) => {
  const getNodeCenter = useCallback(
    (nodeId: string): { x: number; y: number } | null => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const abs =
        (node as any).positionAbsolute ||
        node.position ||
        ({ x: 0, y: 0 } as { x: number; y: number });
      const baseX = typeof abs.x === "number" ? abs.x : 0;
      const baseY = typeof abs.y === "number" ? abs.y : 0;

      const width = getNodeDimension(node, "width");
      const height = getNodeDimension(node, "height");

      return { x: baseX + width / 2, y: baseY + height / 2 };
    },
    [nodes]
  );

  const getEdgeMidpoint = useCallback(
    (edgeId: string): { x: number; y: number } | null => {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return null;

      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return null;

      if ((edge as any).type === "objection") {
        const sourcePosition =
          sourceNode.position.y < targetNode.position.y
            ? Position.Bottom
            : Position.Top;
        const targetPosition =
          sourceNode.position.y > targetNode.position.y
            ? Position.Bottom
            : Position.Top;

        const sourceHandle = getHandlePosition(sourceNode, sourcePosition);
        const targetHandle = getHandlePosition(targetNode, targetPosition);

        if (sourceHandle && targetHandle) {
          const curvature = 0.35;
          const [, labelX, labelY] = getBezierPath({
            sourceX: sourceHandle.x,
            sourceY: sourceHandle.y,
            sourcePosition,
            targetX: targetHandle.x,
            targetY: targetHandle.y,
            targetPosition,
            curvature,
          });
          return { x: labelX, y: labelY };
        }

        const sourceCenterFallback = getNodeCenter(edge.source);
        const targetCenterFallback = getNodeCenter(edge.target);
        if (!sourceCenterFallback || !targetCenterFallback) return null;
        return {
          x: (sourceCenterFallback.x + targetCenterFallback.x) / 2,
          y: (sourceCenterFallback.y + targetCenterFallback.y) / 2,
        };
      }

      const sourceCenter = getNodeCenter(edge.source);
      const targetCenter = getNodeCenter(edge.target);
      if (sourceCenter && targetCenter) {
        const fallbackX = (sourceCenter.x + targetCenter.x) / 2;
        const fallbackY = (sourceCenter.y + targetCenter.y) / 2;
        const [midX, midY] = computeMidpointBetweenBorders(
          sourceNode as any,
          targetNode as any,
          fallbackX,
          fallbackY
        );
        return { x: midX, y: midY };
      }

      return null;
    },
    [edges, nodes, getNodeCenter]
  );

  return {
    getNodeCenter,
    getEdgeMidpoint,
  };
};
