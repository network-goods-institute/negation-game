import React from "react";
import { Edge, EdgeProps } from "@xyflow/react";
import { BaseEdge } from "./common/BaseEdge";

export type ObjectionEdgeType = Edge<any, "objection">;
export interface ObjectionEdgeProps extends EdgeProps<ObjectionEdgeType> { }

export const ObjectionEdge = (props: ObjectionEdgeProps) => {
  return <BaseEdge {...props} edgeType="objection" />;
};

