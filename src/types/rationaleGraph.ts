import { Node, Edge, NodeTypes, EdgeTypes } from "@xyflow/react";
import {
  PreviewStatementNode,
  PreviewStatementNodeData,
} from "@/components/chatbot/PreviewStatementNode";
import {
  PreviewPointNode,
  PreviewPointNodeData,
} from "@/components/chatbot/PreviewPointNode";
import {
  PreviewAddPointNode,
  PreviewAddPointNodeData,
} from "@/components/chatbot/PreviewAddPointNode";
import { NegationEdge } from "@/components/graph/NegationEdge";

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
