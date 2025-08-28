import React from 'react';
import { createPortal } from 'react-dom';
import { ReactFlow, Background, Controls, MiniMap, Edge, Node, useReactFlow, useViewport } from '@xyflow/react';
import { CursorOverlay } from './CursorOverlay';
import { CursorReporter } from './CursorReporter';
import { nodeTypes, edgeTypes } from '@/data/experiment/multiplayer/sampleData';
import { WebsocketProvider } from 'y-websocket';
import { ContextMenu } from './common/ContextMenu';
import { useGraphActions } from './GraphContext';

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
  onEdgeClick?: any;
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
  onBackgroundMouseUp?: () => void;
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
  onEdgeClick,
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
  onBackgroundMouseUp,
}) => {
  const rf = useReactFlow();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const graph = useGraphActions();
  const [cmOpen, setCmOpen] = React.useState(false);
  const [cmPos, setCmPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cmFlow, setCmFlow] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [subOpen, setSubOpen] = React.useState(false);
  const [subPos, setSubPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [edgesLayer, setEdgesLayer] = React.useState<SVGElement | null>(null);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const active = (document.activeElement as HTMLElement | null) || null;
      const isEditable = (el: HTMLElement | null) => {
        if (!el) return false;
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
        if (el.isContentEditable) return true;
        return false;
      };
      if (isEditable(target) || isEditable(active)) return;

      if (key === 'delete' || key === 'backspace') {
        const sel = rf.getNodes().filter((n) => (n as any).selected);
        if (sel.length > 0) {
          e.preventDefault();
          sel.forEach((n) => graph.deleteNode?.(n.id));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rf, graph]);
  React.useEffect(() => {
    if (!connectMode || !onFlowMouseMove) return;
    const handler = (e: MouseEvent) => {
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onFlowMouseMove(p.x, p.y);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [connectMode, onFlowMouseMove, rf]);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!onFlowMouseMove) return;
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    onFlowMouseMove(p.x, p.y);
  };
  const handleMouseUp = () => {
    if (connectMode) {
      onBackgroundMouseUp?.();
    }
  };
  React.useEffect(() => {
    if (!containerRef.current) return;
    // React Flow edges SVG typically lives at: div.react-flow__edges > svg
    const el = containerRef.current.querySelector('div.react-flow__edges > svg') as SVGElement | null;
    setEdgesLayer(el);
  }, [nodes, edges]);

  const onCanvasContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isNode = target.closest('.react-flow__node');
    const isEdge = target.closest('.react-flow__edge');
    if (isNode || isEdge) return;
    e.preventDefault();
    const flowP = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setCmPos({ x: e.clientX, y: e.clientY });
    setCmFlow(flowP);
    setCmOpen(true);
    setSubOpen(false);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative" onMouseMove={connectMode ? handleMouseMove : undefined} onMouseUp={handleMouseUp} onContextMenu={onCanvasContextMenu}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={authenticated ? onNodesChange : undefined}
        onEdgesChange={authenticated ? onEdgesChange : undefined}
        onConnect={authenticated ? onConnect : undefined}
        onNodeClick={onNodeClick}
        onPaneClick={() => { try { graph.setSelectedEdge?.(null); } catch {} }}
        onEdgeClick={(e, edge) => { e.stopPropagation(); graph.setSelectedEdge?.(edge.id); onEdgeClick?.(e, edge); }}
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
        nodesDraggable={!connectMode}
      >
        <Background />
        <Controls />
        <MiniMap nodeColor={() => '#dbeafe'} className="bg-white" />
      </ReactFlow>
      {/* Canvas context menu */}
      <ContextMenu
        open={cmOpen}
        x={cmPos.x}
        y={cmPos.y}
        onClose={() => setCmOpen(false)}
        items={[
          { label: 'Add point…', onClick: () => { setSubPos(cmPos); setSubOpen(true); } },
        ]}
      />
      <ContextMenu
        open={subOpen}
        x={subPos.x}
        y={subPos.y}
        onClose={() => setSubOpen(false)}
        items={[
          { label: 'Statement', onClick: () => graph.addNodeAtPosition?.('statement', cmFlow.x, cmFlow.y) },
          { label: 'Point', onClick: () => graph.addNodeAtPosition?.('point', cmFlow.x, cmFlow.y) },
          { label: 'Objection', onClick: () => graph.addNodeAtPosition?.('objection', cmFlow.x, cmFlow.y) },
        ]}
      />
      {/* Connect overlay: draw a line from anchor node center to cursor */}
      {connectMode && connectAnchorId && connectCursor && edgesLayer && createPortal((() => {
        const n = rf.getNode(connectAnchorId);
        if (!n) return null as any;
        const computeCenter = () => {
          const hasDims = typeof n.width === 'number' && typeof n.height === 'number' && (n.width as number) > 0 && (n.height as number) > 0;
          if (hasDims) {
            return { cx: (n.position.x + (n.width || 0) / 2), cy: (n.position.y + (n.height || 0) / 2) };
          }
          const el = containerRef.current?.querySelector(`.react-flow__node[data-id="${n.id}"]`) as HTMLElement | null;
          if (el) {
            const rect = el.getBoundingClientRect();
            const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            const p = rf.screenToFlowPosition(center);
            return { cx: p.x, cy: p.y };
          }
          return { cx: n.position.x, cy: n.position.y };
        };
        const { cx: sx, cy: sy } = computeCenter();
        const tx = connectCursor.x;
        const ty = connectCursor.y;
        return (
          <g className="react-flow__connection-preview" style={{ pointerEvents: 'none' }}>
            <defs>
              <marker id={`rf-preview-arrow-${connectAnchorId}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
              </marker>
            </defs>
            <line x1={sx} y1={sy} x2={tx} y2={ty} stroke="#2563eb" strokeOpacity={0.95} strokeWidth={2.5} markerEnd={`url(#rf-preview-arrow-${connectAnchorId})`} />
          </g>
        );
      })(), edgesLayer)}
      {authenticated && <CursorOverlay cursors={cursors} />}
      {authenticated && (
        <CursorReporter provider={provider} username={username} userColor={userColor} />
      )}
    </div>
  );
};
