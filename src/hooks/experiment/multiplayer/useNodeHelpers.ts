import { useCallback } from "react";
import { Node, Edge } from "@xyflow/react";

interface UseNodeHelpersProps {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Gets the dimension (width or height) from a node, checking multiple sources
 */
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

/**
 * Custom hook providing helper functions for node and edge position calculations
 */
export const useNodeHelpers = ({ nodes, edges }: UseNodeHelpersProps) => {
  /**
   * Calculate the center point of a node
   * @param nodeId - The ID of the node
   * @returns Center coordinates {x, y} or null if node not found
   */
  const getNodeCenter = useCallback(
    (nodeId: string): { x: number; y: number } | null => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return null;

      const abs = (node as any).positionAbsolute ||
        node.position || { x: 0, y: 0 };
      const baseX = typeof abs.x === "number" ? abs.x : 0;
      const baseY = typeof abs.y === "number" ? abs.y : 0;

      const width = getNodeDimension(node, "width");
      const height = getNodeDimension(node, "height");

      return { x: baseX + width / 2, y: baseY + height / 2 };
    },
    [nodes]
  );

  /**
   * Calculate the midpoint of an edge between its source and target nodes
   * @param edgeId - The ID of the edge
   * @returns Midpoint coordinates {x, y} or null if edge or nodes not found
   */
  const getEdgeMidpoint = useCallback(
    (edgeId: string): { x: number; y: number } | null => {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return null;
      const sourceCenter = getNodeCenter(edge.source);
      const targetCenter = getNodeCenter(edge.target);
      if (sourceCenter && targetCenter) {
        return {
          x: (sourceCenter.x + targetCenter.x) / 2,
          y: (sourceCenter.y + targetCenter.y) / 2,
        };
      }
      return null;
    },
    [edges, getNodeCenter]
  );

  return {
    getNodeCenter,
    getEdgeMidpoint,
  };
};
