import { useCallback, useMemo } from "react";
import { Node, Edge, getBezierPath, Position } from "@xyflow/react";
import { computeMidpointBetweenBorders, getNodeAttachmentPoint } from "@/utils/experiment/multiplayer/edgePathUtils";
import { getOrthogonalPathSimple } from "@/utils/experiment/multiplayer/orthogonalPath";
import { EDGE_CONFIGURATIONS, EdgeType } from "@/components/experiment/multiplayer/common/EdgeConfiguration";

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
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const getNodeById = useCallback((id: string) => nodesById.get(id), [nodesById]);

  const getNodeCenter = useCallback(
    (nodeId: string): { x: number; y: number } | null => {
      const node = getNodeById(nodeId);
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
    [getNodeById]
  );

  const getEdgeMidpoint = useCallback(
    (edgeId: string): { x: number; y: number } | null => {
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return null;

      const sourceNode = getNodeById(edge.source);
      const targetNode = getNodeById(edge.target);
      if (!sourceNode || !targetNode) return null;

      const edgeType = (edge as any).type as EdgeType | undefined;
      const config = edgeType ? EDGE_CONFIGURATIONS[edgeType] : null;
      const routing = config?.visual?.routing;

      const sourceCenter = getNodeCenter(edge.source);
      const targetCenter = getNodeCenter(edge.target);
      if (!sourceCenter || !targetCenter) return null;

      const attachmentSource = getNodeAttachmentPoint(
        String(edge.source ?? ''),
        String(edge.target ?? ''),
        String((edge as any).id ?? ''),
        edges,
        getNodeById,
        { spacing: 16, directionalBase: edgeType === 'objection' }
      );

      const attachmentTarget = getNodeAttachmentPoint(
        String(edge.target ?? ''),
        String(edge.source ?? ''),
        String((edge as any).id ?? ''),
        edges,
        getNodeById,
        { spacing: 16, directionalBase: edgeType === 'objection' }
      );

      const effectiveSource = attachmentSource ?? sourceCenter;
      const effectiveTarget = attachmentTarget ?? targetCenter;

      if (routing === 'orthogonal') {
        const result = getOrthogonalPathSimple(
          effectiveSource.x,
          effectiveSource.y,
          effectiveTarget.x,
          effectiveTarget.y,
          { cornerRadius: config?.visual?.cornerRadius ?? 6 }
        );
        return { x: result.labelX, y: result.labelY };
      }

      if (edgeType === "objection") {
        const sourcePosition =
          effectiveSource.y < effectiveTarget.y ? Position.Bottom : Position.Top;
        const targetPosition =
          effectiveSource.y > effectiveTarget.y ? Position.Bottom : Position.Top;

        const curvature = 0.35;
        const [, labelX, labelY] = getBezierPath({
          sourceX: effectiveSource.x,
          sourceY: effectiveSource.y,
          sourcePosition,
          targetX: effectiveTarget.x,
          targetY: effectiveTarget.y,
          targetPosition,
          curvature,
        });
        return { x: labelX, y: labelY };
      }

      if (attachmentSource || attachmentTarget) {
        return {
          x: (effectiveSource.x + effectiveTarget.x) / 2,
          y: (effectiveSource.y + effectiveTarget.y) / 2,
        };
      }

      const fallbackX = (sourceCenter.x + targetCenter.x) / 2;
      const fallbackY = (sourceCenter.y + targetCenter.y) / 2;
      const [midX, midY] = computeMidpointBetweenBorders(
        sourceNode as any,
        targetNode as any,
        fallbackX,
        fallbackY
      );
      return { x: midX, y: midY };
    },
    [edges, getNodeById, getNodeCenter]
  );

  return {
    getNodeCenter,
    getEdgeMidpoint,
  };
};
