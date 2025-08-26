import React from 'react';
import { ReactFlow, Background, Controls, MiniMap, Edge, Node } from '@xyflow/react';
import { CursorOverlay } from './CursorOverlay';
import { CursorReporter } from './CursorReporter';
import { nodeTypes, edgeTypes } from '@/data/experiment/multiplayer/sampleData';
import { WebsocketProvider } from 'y-websocket';

type YProvider = WebsocketProvider | null;

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  authenticated: boolean;
  onNodesChange?: any;
  onEdgesChange?: any;
  onConnect?: any;
  onNodeClick?: (e: any, node: any) => void;
  onNodeDragStart?: any;
  onNodeDragStop?: any;
  onEdgeMouseEnter?: any;
  onEdgeMouseLeave?: any;
  provider: YProvider;
  cursors: Map<number, { fx?: number; fy?: number; name: string; color: string }>;
  username: string;
  userColor: string;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  authenticated,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDragStart,
  onNodeDragStop,
  onEdgeMouseEnter,
  onEdgeMouseLeave,
  provider,
  cursors,
  username,
  userColor,
}) => {
  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={authenticated ? onNodesChange : undefined}
        onEdgesChange={authenticated ? onEdgesChange : undefined}
        onConnect={authenticated ? onConnect : undefined}
        onNodeClick={onNodeClick}
        onNodeDragStart={authenticated ? onNodeDragStart : undefined}
        onNodeDragStop={authenticated ? onNodeDragStop : undefined}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="w-full h-full bg-gray-50"
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
      >
        <Background />
        <Controls />
        <MiniMap nodeColor={() => '#dbeafe'} className="bg-white" />
      </ReactFlow>
      {authenticated && <CursorOverlay cursors={cursors} />}
      {authenticated && (
        <CursorReporter provider={provider} username={username} userColor={userColor} />
      )}
    </>
  );
};