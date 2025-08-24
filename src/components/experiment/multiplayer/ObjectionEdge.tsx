import { BezierEdge, Edge, EdgeProps } from "@xyflow/react";

export type ObjectionEdgeType = Edge<any, "objection">;
export interface ObjectionEdgeProps extends EdgeProps<ObjectionEdgeType> { }

export const ObjectionEdge = (props: ObjectionEdgeProps) => {
    return (
        <BezierEdge
            {...props}
            style={{
                strokeWidth: 3,
                strokeDasharray: "8,4",
                stroke: "#f97316",
            }}
            pathOptions={{ curvature: 0.35 }}
        />
    );
};


