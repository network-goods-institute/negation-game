import { BezierEdge, Edge, EdgeProps } from "@xyflow/react";

// Define the underlying edge type for negations
export type NegationEdgeType = Edge<any, "negation">;

// Props for the NegationEdge component
export interface NegationEdgeProps extends EdgeProps<NegationEdgeType> { }

export const NegationEdge = ({ ...props }: NegationEdgeProps) => {
  return (
    <BezierEdge
      {...props}
      style={{ strokeWidth: 2 }}
      label="-"
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
