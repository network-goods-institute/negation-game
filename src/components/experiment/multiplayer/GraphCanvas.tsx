import React from 'react';
import { ReactFlow, Background, Controls, MiniMap, Edge, Node, useReactFlow, useViewport } from '@xyflow/react';
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
  panOnDrag?: boolean | number[];
  panOnScroll?: boolean | number[];
  zoomOnScroll?: boolean;
  connectMode?: boolean;
  connectAnchorId?: string | null;
  onFlowMouseMove?: (flowX: number, flowY: number) => void;
  connectCursor?: { x: number; y: number } | null;
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
  panOnDrag,
  panOnScroll,
  zoomOnScroll,
  connectMode,
  connectAnchorId,
  onFlowMouseMove,
  connectCursor,
}) => {
  const rf = useReactFlow();
  const { x: vx, y: vy, zoom } = useViewport();
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!onFlowMouseMove) return;
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    onFlowMouseMove(p.x, p.y);
  };
  return (
    <div className="w-full h-full" onMouseMove={connectMode ? handleMouseMove : undefined}>
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
        panOnDrag={panOnDrag}
        panOnScroll={panOnScroll as any}
        zoomOnScroll={zoomOnScroll}
      >
        <Background />
        <Controls />
        <MiniMap nodeColor={() => '#dbeafe'} className="bg-white" />
      </ReactFlow>
      {/* Connect overlay: draw a line from anchor node center to cursor */}
      {connectMode && connectAnchorId && connectCursor && (
        <svg className="pointer-events-none absolute inset-0">
          {(() => {
            const n = rf.getNode(connectAnchorId);
            if (!n) return null as any;
            const sx = (n.position.x + (n.width || 0) / 2) * zoom + vx;
            const sy = (n.position.y + (n.height || 0) / 2) * zoom + vy;
            const tx = connectCursor.x * zoom + vx;
            const ty = connectCursor.y * zoom + vy;
            return (
              <>
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
                  </marker>
                </defs>
                <line x1={sx} y1={sy} x2={tx} y2={ty} stroke="#2563eb" strokeWidth={2} markerEnd="url(#arrow)" />
              </>
            );
          })()}
        </svg>
      )}
      {authenticated && <CursorOverlay cursors={cursors} />}
      {authenticated && (
        <CursorReporter provider={provider} username={username} userColor={userColor} />
      )}
    </div>
  );
};
