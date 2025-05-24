import type { NegationEdgeType } from "@/components/graph/edges/NegationEdge";
import type { Edge as XYFlowEdge } from "@xyflow/react";

export type AppEdge = NegationEdgeType | XYFlowEdge;
