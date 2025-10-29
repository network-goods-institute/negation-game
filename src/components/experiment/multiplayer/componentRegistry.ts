import { NodeTypes } from "@xyflow/react";
import { PointNode } from "@/components/experiment/multiplayer/PointNode";
import { NegationEdge } from "@/components/experiment/multiplayer/NegationEdge";
import { SupportEdge } from "@/components/experiment/multiplayer/SupportEdge";
import { ObjectionEdge } from "@/components/experiment/multiplayer/ObjectionEdge";
import { OptionEdge } from "@/components/experiment/multiplayer/OptionEdge";
import { StatementNode } from "@/components/experiment/multiplayer/StatementNode";
import { GroupNode } from "@/components/experiment/multiplayer/GroupNode";
import ObjectionNode from "@/components/experiment/multiplayer/objection/ObjectionNode";
import EdgeAnchorNode from "@/components/experiment/multiplayer/objection/EdgeAnchorNode";
import CommentNode from "@/components/experiment/multiplayer/CommentNode";

/**
 * Registry of all React Flow node types and their corresponding React components.
 * This is the definitive mapping used by ReactFlow to render nodes in the multiplayer experiment.
 */
export const nodeTypes: NodeTypes = {
  statement: StatementNode,
  point: PointNode,
  objection: ObjectionNode,
  comment: CommentNode,
  edge_anchor: EdgeAnchorNode,
  group: GroupNode,
};

/**
 * Registry of all React Flow edge types and their corresponding React components.
 * This is the definitive mapping used by ReactFlow to render edges in the multiplayer experiment.
 */
export const edgeTypes = {
  negation: NegationEdge,
  support: SupportEdge,
  objection: ObjectionEdge,
  option: OptionEdge,
};
