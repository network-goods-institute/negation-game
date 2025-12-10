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

  if (typeof (node as any)[dimension] === "number") {
    return (node as any)[dimension];
  }
  if (typeof measured?.[dimension] === "number") {
    return measured[dimension];
  }
  if (typeof style?.[dimension] === "number") {
    return style[dimension];
  }
  return 0;
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
        const sourceCenter = getNodeCenter(edge.source);
        const targetCenter = getNodeCenter(edge.target);
        if (!sourceCenter || !targetCenter) return null;

        const sourcePosition =
          sourceCenter.y < targetCenter.y ? Position.Bottom : Position.Top;
        const targetPosition =
          sourceCenter.y > targetCenter.y ? Position.Bottom : Position.Top;

        const curvature = 0.35;
        const [, labelX, labelY] = getBezierPath({
          sourceX: sourceCenter.x,
          sourceY: sourceCenter.y,
          sourcePosition,
          targetX: targetCenter.x,
          targetY: targetCenter.y,
          targetPosition,
          curvature,
        });
        return { x: labelX, y: labelY };
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
