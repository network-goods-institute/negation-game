import { Node, Edge, NodeTypes } from "@xyflow/react";
import { PointNode } from "@/components/experiment/multiplayer/PointNode";
import { NegationEdge } from "@/components/experiment/multiplayer/NegationEdge";
import { ObjectionEdge } from "@/components/experiment/multiplayer/ObjectionEdge";
import { StatementEdge } from "@/components/experiment/multiplayer/StatementEdge";
import { StatementNode } from "@/components/experiment/multiplayer/StatementNode";
import ObjectionNode from "@/components/experiment/multiplayer/objection/ObjectionNode";
import EdgeAnchorNode from "@/components/experiment/multiplayer/objection/EdgeAnchorNode";

export const sampleRationale = {
  id: "sample",
  title: "Universal Basic Income – debate map",
  description: "A small rationale exploring UBI claims and counterclaims.",
};

export const initialNodes: Node[] = [
  {
    id: "1",
    type: "point",
    position: { x: 250, y: 50 },
    data: {
      content:
        "Universal Basic Income would reduce poverty and provide economic security for all citizens.",
    },
  },
  {
    id: "2",
    type: "point",
    position: { x: 100, y: 200 },
    data: {
      content:
        "UBI would be too expensive and would require massive tax increases that could harm economic growth.",
    },
  },
  {
    id: "3",
    type: "point",
    position: { x: 400, y: 200 },
    data: {
      content:
        "UBI could reduce work incentives and lead to decreased productivity across society.",
    },
  },
  {
    id: "4",
    type: "point",
    position: { x: 50, y: 350 },
    data: {
      content:
        "Alaska has successfully implemented a dividend system for decades without major economic disruption.",
    },
  },
  {
    id: "5",
    type: "point",
    position: { x: 520, y: 320 },
    data: {
      content:
        "UBI pilots show improved well-being without reducing labor participation in the short term.",
    },
  },
];

export const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "2",
    target: "1",
    type: "negation",
  },
  {
    id: "e1-3",
    source: "3",
    target: "1",
    type: "negation",
  },
  {
    id: "e2-4",
    source: "4",
    target: "2",
    type: "negation",
  },
  {
    id: "e3-2",
    source: "3",
    target: "2",
    type: "objection",
  },
  {
    id: "e5-3",
    source: "5",
    target: "3",
    type: "objection",
  },
];

export const nodeTypes: NodeTypes = {
  statement: StatementNode,
  point: PointNode,
  objection: ObjectionNode,
  edge_anchor: EdgeAnchorNode,
};

export const edgeTypes = {
  negation: NegationEdge,
  objection: ObjectionEdge,
  statement: StatementEdge,
};

export const generateRandomUser = () => {
  const colors = [
    "#ef4444",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
  ];
  return {
    username: `User${Math.floor(Math.random() * 1000)}`,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
};
