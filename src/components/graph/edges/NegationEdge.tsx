import { BezierEdge, Edge, EdgeProps, useReactFlow } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { PointNodeData } from "@/components/graph/nodes/PointNode";
import { PreviewPointNodeData } from "@/components/chatbot/preview/PreviewPointNode";
import { isEdgeAffectedAtom } from "@/atoms/affectedRelationshipsAtom";

// Define the underlying edge type for negations
export type NegationEdgeType = Edge<any, "negation">;

// Props for the NegationEdge component
export interface NegationEdgeProps extends EdgeProps<NegationEdgeType> { }

export const NegationEdge = (props: NegationEdgeProps) => {
  const { getNode } = useReactFlow();
  const targetNode = getNode(props.target);
  const sourceNode = getNode(props.source);
  const isEdgeAffected = useAtomValue(isEdgeAffectedAtom);

  // Check for objection in the TARGET node (the node doing the negating/objecting)
  const isObjectionEdge = targetNode?.type === 'point' && (() => {
    const targetData = targetNode.data as PointNodeData | PreviewPointNodeData;

    // If it's not marked as an objection, it's not an objection edge
    if (!targetData?.isObjection) {
      return false;
    }

    // For regular PointNodeData
    if ('pointId' in targetData) {
      const sourceData = sourceNode?.data as PointNodeData | undefined;
      return targetData.objectionTargetId === sourceData?.pointId;
    }

    // For PreviewPointNodeData
    if ('content' in targetData && !('pointId' in targetData)) {
      const sourceData = sourceNode?.data as PreviewPointNodeData | undefined;

      // Handle string node IDs (preview nodes)
      if (typeof targetData.objectionTargetId === 'string') {
        return targetData.objectionTargetId === sourceNode?.id;
      }

      // Handle numeric point IDs
      if (typeof targetData.objectionTargetId === 'number') {
        return targetData.objectionTargetId === sourceData?.existingPointId;
      }
    }

    return false;
  })();

  const showLabel = targetNode?.type !== "statement";
  const labelContent = isObjectionEdge ? "/" : "-";

  const sourcePointId = sourceNode?.data?.pointId;
  const targetPointId = targetNode?.data?.pointId;
  const edgeId = sourcePointId && targetPointId && typeof sourcePointId === 'number' && typeof targetPointId === 'number'
    ? `negation-${Math.min(sourcePointId, targetPointId)}-${Math.max(sourcePointId, targetPointId)}`
    : null;
  const isAffected = edgeId ? isEdgeAffected(edgeId) : false;

  return (
    <BezierEdge
      {...props}
      style={{
        strokeWidth: isAffected ? 3 : 2,
        strokeDasharray: isObjectionEdge ? "8,4" : undefined,
        stroke: isAffected
          ? "hsl(0 80% 60%)" // Red for affected edges
          : (isObjectionEdge ? "hsl(25 95% 53%)" : "#6b7280"),
        animation: isAffected ? "pulse 2s infinite" : undefined,
      }}
      label={showLabel ? labelContent : undefined}
      labelShowBg={false}
      labelStyle={{
        padding: 0,
        width: 20,
        height: 20,
        stroke: "hsl(var(--background))",
        strokeWidth: 2,
        fontSize: isObjectionEdge ? 36 : 36,
        fontWeight: 600,
        fill: isAffected
          ? "hsl(0 80% 60%)" // Red for affected edge labels
          : (isObjectionEdge ? "hsl(25 95% 53%)" : "#374151"),
      }}
      pathOptions={{
        curvature: isObjectionEdge ? 0.3 : 0.15,
      }}
    />
  );
};
