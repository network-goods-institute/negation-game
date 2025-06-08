import { BezierEdge, Edge, EdgeProps, useReactFlow } from "@xyflow/react";
import { PointNodeData } from "@/components/graph/nodes/PointNode";

// Define the underlying edge type for negations
export type NegationEdgeType = Edge<any, "negation">;

// Props for the NegationEdge component
export interface NegationEdgeProps extends EdgeProps<NegationEdgeType> { }

export const NegationEdge = (props: NegationEdgeProps) => {
  const { getNode } = useReactFlow();
  // Hide hyphen label when connecting to a statement node (options should not display hyphens)
  const targetNode = getNode(props.target);
  const sourceNode = getNode(props.source);

  const isObjectionEdge = sourceNode?.type === 'point' &&
    (sourceNode.data as PointNodeData)?.isObjection &&
    (sourceNode.data as PointNodeData)?.objectionTargetId === (targetNode?.data as PointNodeData)?.pointId;

  const showLabel = targetNode?.type !== "statement";
  const labelContent = isObjectionEdge ? "/" : "-"; // Changed to a simple forward slash

  return (
    <BezierEdge
      {...props}
      style={{ strokeWidth: 2 }}
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
      }}
    />
  );
};
