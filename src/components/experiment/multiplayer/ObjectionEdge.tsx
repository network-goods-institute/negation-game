import { BezierEdge, Edge, EdgeProps, useReactFlow } from "@xyflow/react";

export type ObjectionEdgeType = Edge<any, "objection">;
export interface ObjectionEdgeProps extends EdgeProps<ObjectionEdgeType> { }

export const ObjectionEdge = (props: ObjectionEdgeProps) => {
    return (
        <BezierEdge
            {...props}
            style={{
                strokeWidth: 2,
                strokeDasharray: "8,4",
                stroke: "hsl(25 95% 53%)",
            }}
            label={"/"}
            labelShowBg={false}
            labelStyle={{
                padding: 0,
                width: 20,
                height: 20,
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
                fontSize: 36,
                fontWeight: 600,
                fill: "hsl(25 95% 53%)",
            }}
            pathOptions={{ curvature: 0.3 }}
        />
    );
};


