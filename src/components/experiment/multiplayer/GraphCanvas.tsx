import React from 'react';
import { createPortal } from 'react-dom';
import { ReactFlow, Background, Controls, MiniMap, Edge, Node, useReactFlow, useViewport } from '@xyflow/react';
import { CursorOverlay } from './CursorOverlay';
import { CursorReporter } from './CursorReporter';
import { nodeTypes, edgeTypes } from '@/components/experiment/multiplayer/componentRegistry';
import { WebsocketProvider } from 'y-websocket';
import { useGraphActions } from './GraphContext';
import OffscreenNeighborPreviews from './OffscreenNeighborPreviews';

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
  grabMode?: boolean;
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
  onBackgroundDoubleClick?: (flowX: number, flowY: number) => void;
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
  grabMode,
  panOnDrag,
  panOnScroll,
  zoomOnScroll,
  connectMode,
  connectAnchorId,
  onFlowMouseMove,
  connectCursor,
  onBackgroundMouseUp,
  onBackgroundDoubleClick,
}) => {
  const rf = useReactFlow();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const graph = useGraphActions();
  const [edgesLayer, setEdgesLayer] = React.useState<SVGElement | null>(null);
  const deselectAllNodes = React.useCallback(() => {
    try {
      (graph as any)?.clearNodeSelection?.();
    } catch { }
  }, [graph]);
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

      if (key === 'escape') {
        if (connectMode) {
          e.preventDefault();
          graph.cancelConnect?.();
        }
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        const sel = rf.getNodes().filter((n) => (n as any).selected);
        const selectedEdgeId = (graph as any)?.selectedEdgeId as string | null;
        if (selectedEdgeId) {
          e.preventDefault();
          graph.deleteNode?.(selectedEdgeId);
          graph.setSelectedEdge?.(null);
          return;
        }
        if (sel.length > 0) {
          e.preventDefault();
          const ids = new Set<string>();
          sel.forEach((n) => {
            const node: any = n as any;
            if (node.type === 'group') {
              ids.add(node.id);
              return;
            }
            const pid = node.parentId;
            if (pid) {
              const p = rf.getNode(pid) as any;
              if (p && p.type === 'group') {
                ids.add(p.id);
                return;
              }
            }
            ids.add(node.id);
          });
          ids.forEach((id) => graph.deleteNode?.(id));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rf, graph, connectMode]);
  React.useEffect(() => {
    if (!connectMode || !connectAnchorId || !onFlowMouseMove) return;
    const handler = (e: MouseEvent) => {
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onFlowMouseMove(p.x, p.y);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [connectMode, connectAnchorId, onFlowMouseMove, rf]);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!connectMode || !connectAnchorId || !onFlowMouseMove) return;
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    onFlowMouseMove(p.x, p.y);
  };
  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!connectMode || !connectAnchorId) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) {
      return;
    }

    if (target.closest('.react-flow__pane')) {
      onBackgroundMouseUp?.();
    }
  };
  React.useEffect(() => {
    if (!containerRef.current) return;
    // React Flow edges SVG typically lives at: div.react-flow__edges > svg
    const el = containerRef.current.querySelector('div.react-flow__edges > svg') as SVGElement | null;
    setEdgesLayer(el);
  }, [nodes, edges]);


  const onCanvasDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    const isNode = target.closest('.react-flow__node') !== null;
    const isEdge = target.closest('.react-flow__edge') !== null;

    const hasDataId = target.closest('[data-id]') !== null;

    if (isNode || isEdge || hasDataId) {
      return;
    }

    e.preventDefault();
    const flowP = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    onBackgroundDoubleClick?.(flowP.x, flowP.y);
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    const isNode = target.closest('.react-flow__node') !== null;
    const isEdge = target.closest('.react-flow__edge') !== null;
    const hasDataId = target.closest('[data-id]') !== null;

    if (!isNode && !isEdge && !hasDataId) {
      graph.setHoveredNodeId?.(null);
    }

    if (connectMode) {
      handleMouseMove(e);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative" onMouseMove={onCanvasMouseMove} onMouseLeave={() => graph.setHoveredNodeId?.(null)} onMouseUp={handleMouseUp} onDoubleClick={onCanvasDoubleClick}>
      {(() => {
        // Wrap changes to intercept removals and route through multiplayer delete
        const handleNodesChange = (changes: any[]) => {
          if (!authenticated) return onNodesChange?.(changes);
          const passthrough: any[] = [];
          let nodeSelected = false;
          for (const c of changes || []) {
            if (c?.type === 'remove' && c?.id) {
              try { graph.deleteNode?.(c.id); } catch { }
            } else {
              if (c?.type === 'select' && c?.selected) {
                nodeSelected = true;
              }
              passthrough.push(c);
            }
          }
          if (nodeSelected) {
            try { graph.setSelectedEdge?.(null); } catch { }
          }
          if (passthrough.length) onNodesChange?.(passthrough);
        };
        const handleEdgesChange = (changes: any[]) => {
          if (!authenticated) return onEdgesChange?.(changes);
          const passthrough: any[] = [];
          for (const c of changes || []) {
            if (c?.type === 'remove' && c?.id) {
              try { graph.deleteNode?.(c.id); } catch { }
            } else if (c?.type === 'position') {
              // Ignore position changes for edges - they shouldn't be manually movable
              continue;
            } else {
              passthrough.push(c);
            }
          }
          if (passthrough.length) onEdgesChange?.(passthrough);
        };
        // Render ReactFlow with wrapped handlers
        return (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={authenticated ? onConnect : undefined}
            onNodeClick={onNodeClick}
            onPaneClick={() => { try { graph.setSelectedEdge?.(null); } catch { } if (connectMode) onBackgroundMouseUp?.(); }}
            onEdgeClick={(e, edge) => {
              e.stopPropagation();
              deselectAllNodes();
              graph.setSelectedEdge?.(edge.id);
              onEdgeClick?.(e, edge);
            }}
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
            zoomOnDoubleClick={false}
            nodesDraggable={!connectMode}
            multiSelectionKeyCode="Shift"
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
            <MiniMap nodeColor={() => '#dbeafe'} className="bg-white" />
          </ReactFlow>
        );
      })()}
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
        const tx = connectCursor?.x ?? sx;
        const ty = connectCursor?.y ?? sy;
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
      <OffscreenNeighborPreviews />
      {authenticated && (
        <CursorReporter provider={provider} username={username} userColor={userColor} grabMode={Boolean(grabMode)} />
      )}
    </div>
  );
};
