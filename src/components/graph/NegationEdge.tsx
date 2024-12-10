import { BezierEdge, EdgeProps } from "@xyflow/react";

export interface NegationEdgeProps extends EdgeProps {}

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
    ></BezierEdge>
  );
};
