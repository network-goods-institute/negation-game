'use client';

import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  OnConnect,
  NodeTypes,
  BezierEdge,
  EdgeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Roboto_Slab } from 'next/font/google';

const robotoSlab = Roboto_Slab({ subsets: ['latin'] });

const PointNode = ({ data, id }: { data: any; id: string }) => {
  return (
    <>
      <Handle
        id={`${id}-source-handle`}
        type="source"
        position={Position.Top}
        className="opacity-0 pointer-events-none"
      />
      <Handle
        id={`${id}-incoming-handle`}
        type="target"
        position={Position.Bottom}
        className="opacity-0 pointer-events-none"
      />
      <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-stone-200 min-w-[200px] max-w-[300px]">
        <div className="text-sm text-gray-900 leading-relaxed">
          {data.content}
        </div>
      </div>
    </>
  );
};

const NegationEdge = (props: EdgeProps) => {
  return (
    <BezierEdge
      {...props}
      style={{
        strokeWidth: 2,
        stroke: "#ef4444",
      }}
      label="-"
      labelShowBg={false}
      labelStyle={{
        padding: 0,
        width: 20,
        height: 20,
        stroke: "white",
        strokeWidth: 2,
        fontSize: 36,
        fontWeight: 600,
        fill: "#ef4444",
      }}
    />
  );
};

const nodeTypes: NodeTypes = {
  point: PointNode,
};

const edgeTypes = {
  negation: NegationEdge,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'point',
    position: { x: 250, y: 50 },
    data: {
      content: 'Universal Basic Income would reduce poverty and provide economic security for all citizens.',
    },
  },
  {
    id: '2',
    type: 'point',
    position: { x: 100, y: 200 },
    data: {
      content: 'UBI would be too expensive and would require massive tax increases that could harm economic growth.',
    },
  },
  {
    id: '3',
    type: 'point',
    position: { x: 400, y: 200 },
    data: {
      content: 'UBI could reduce work incentives and lead to decreased productivity across society.',
    },
  },
  {
    id: '4',
    type: 'point',
    position: { x: 50, y: 350 },
    data: {
      content: 'Alaska has successfully implemented a dividend system for decades without major economic disruption.',
    },
  },
  {
    id: '5',
    type: 'point',
    position: { x: 300, y: 350 },
    data: {
      content: 'Automation will eliminate many jobs, making UBI necessary for social stability.',
    },
  },
  {
    id: '6',
    type: 'point',
    position: { x: 550, y: 350 },
    data: {
      content: 'Studies show people continue working even with guaranteed income, as work provides purpose beyond money.',
    },
  },
  {
    id: '7',
    type: 'point',
    position: { x: 700, y: 200 },
    data: {
      content: 'Historical welfare programs show dependency issues when unconditional benefits are provided.',
    },
  },
  {
    id: '8',
    type: 'point',
    position: { x: 150, y: 500 },
    data: {
      content: 'UBI trials in Kenya and Finland showed positive outcomes without reducing work motivation.',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '2',
    target: '1',
    type: 'negation',
  },
  {
    id: 'e1-3',
    source: '3',
    target: '1',
    type: 'negation',
  },
  {
    id: 'e1-7',
    source: '7',
    target: '1',
    type: 'negation',
  },
  {
    id: 'e2-4',
    source: '4',
    target: '2',
    type: 'negation',
  },
  {
    id: 'e2-8',
    source: '8',
    target: '2',
    type: 'negation',
  },
  {
    id: 'e3-5',
    source: '5',
    target: '3',
    type: 'negation',
  },
  {
    id: 'e3-6',
    source: '6',
    target: '3',
    type: 'negation',
  },
  {
    id: 'e7-8',
    source: '8',
    target: '7',
    type: 'negation',
  },
];

export default function ExperimentalBoardPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'negation',
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  return (
    <div className={`fixed inset-0 top-16 bg-gray-50 ${robotoSlab.className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="w-full h-full bg-gray-50"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={() => '#dbeafe'}
          className="bg-white"
        />
      </ReactFlow>
    </div>
  );
}
