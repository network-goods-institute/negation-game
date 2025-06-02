import { BezierEdge, Edge, EdgeProps, useReactFlow } from "@xyflow/react";

// Define the underlying edge type for negations
export type NegationEdgeType = Edge<any, "negation">;

// Props for the NegationEdge component
export interface NegationEdgeProps extends EdgeProps<NegationEdgeType> { }

export const NegationEdge = (props: NegationEdgeProps) => {
  const { getNode } = useReactFlow();
  // Hide hyphen label when connecting to a statement node (options should not display hyphens)
  const targetNode = getNode(props.target);
  const showLabel = targetNode?.type !== "statement";
  return (
    <BezierEdge
      {...props}
      style={{ strokeWidth: 2 }}
      label={showLabel ? "-" : undefined}
      labelShowBg={false}
      labelStyle={{
        padding: 0,
        width: 20,
        height: 20,
        stroke: "hsl(var(--background))",
        strokeWidth: 2,
        fontSize: 36,
        fontWeight: 600,
      }}
    />
  );
};
