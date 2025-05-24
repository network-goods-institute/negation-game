import { Node, Edge, NodeTypes, EdgeTypes } from "@xyflow/react";
import {
  PreviewPointNode,
  PreviewPointNodeData,
} from "@/components/chatbot/preview/PreviewPointNode";
import {
  PreviewAddPointNode,
  PreviewAddPointNodeData,
} from "@/components/chatbot/preview/PreviewAddPointNode";
import { NegationEdge } from "@/components/graph/edges/NegationEdge";
import {
  PreviewStatementNode,
  PreviewStatementNodeData,
} from "@/components/chatbot/preview/PreviewStatementNode";

export type PreviewAppNode =
  | Node<PreviewStatementNodeData, "statement">
  | Node<PreviewPointNodeData, "point">
  | Node<PreviewAddPointNodeData, "addPoint">;

export type PreviewAppEdge = Edge;

export const nodeTypes: NodeTypes = {
  statement: PreviewStatementNode,
  point: PreviewPointNode,
  addPoint: PreviewAddPointNode,
};

export const edgeTypes: EdgeTypes = {
  negation: NegationEdge,
};
