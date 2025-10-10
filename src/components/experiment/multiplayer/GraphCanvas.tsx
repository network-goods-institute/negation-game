import React from 'react';
import { createPortal } from 'react-dom';
import { ReactFlow, Background, Controls, MiniMap, Edge, Node, useReactFlow, useViewport, SelectionMode } from '@xyflow/react';
import { toast } from 'sonner';
import { CursorOverlay } from './CursorOverlay';
import { CursorReporter } from './CursorReporter';
import { nodeTypes, edgeTypes } from '@/components/experiment/multiplayer/componentRegistry';
import { WebsocketProvider } from 'y-websocket';
import { useGraphActions } from './GraphContext';
import OffscreenNeighborPreviews from './OffscreenNeighborPreviews';
import { useKeyboardPanning } from '@/hooks/experiment/multiplayer/useKeyboardPanning';
import { useConnectionSnapping } from '@/hooks/experiment/multiplayer/useConnectionSnapping';
import { usePerformanceMode } from './PerformanceContext';

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
  canWrite?: boolean;
  panOnDrag?: boolean | number[];
  panOnScroll?: boolean | number[];
  zoomOnScroll?: boolean;
  connectMode?: boolean;
  connectAnchorId?: string | null;
  onFlowMouseMove?: (flowX: number, flowY: number) => void;
  connectCursor?: { x: number; y: number } | null;
  onBackgroundMouseUp?: () => void;
  onBackgroundDoubleClick?: (flowX: number, flowY: number) => void;
  selectMode: boolean;
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
  canWrite,
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
  selectMode,
}) => {
  const rf = useReactFlow();
  const viewport = useViewport();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const graph = useGraphActions();
  const [edgesLayer, setEdgesLayer] = React.useState<SVGElement | null>(null);
  const suppressEdgeDeselectRef = React.useRef(false);
  const lastSelectionChangeRef = React.useRef<number>(0);
  const { perfMode } = usePerformanceMode();
  const { setPerfMode } = usePerformanceMode();
  const midPanRef = React.useRef(false);

  const { origin, snappedPosition, snappedTarget: componentSnappedTarget } = useConnectionSnapping({
    connectMode: !!connectMode,
    connectAnchorId,
    connectCursor: connectCursor ?? null,
    edgesLayer,
    containerRef,
  });
  const deselectAllNodes = React.useCallback(() => {
    try {
      (graph as any)?.clearNodeSelection?.();
    } catch { }
  }, [graph]);

  useKeyboardPanning({
    connectMode,
    onCancelConnect: graph.cancelConnect,
  });
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

      const isDeleteKey = key === 'delete' || key === 'backspace';
      if (isDeleteKey) {
        // Block deletions while any node is in edit mode
        if ((graph as any)?.isAnyNodeEditing) {
          e.preventDefault();
          return;
        }
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
          return;
        }
        // Nothing selected: prevent browser navigation on Backspace/Delete
        e.preventDefault();
        return;
      }
      if (key === 'escape') {
        try { (graph as any)?.clearNodeSelection?.(); } catch { }
        try { (graph as any)?.setSelectedEdge?.(null); } catch { }
        e.preventDefault();
        return;
      }
    };

    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKey as any, { capture: true } as any);
    };
  }, [rf, graph]);
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
      // Use the snapped target from the component level hook
      if (componentSnappedTarget && componentSnappedTarget.kind) {
        if (componentSnappedTarget.kind === 'node') {
          (graph as any)?.completeConnectToNode?.(componentSnappedTarget.id);
        } else if (componentSnappedTarget.kind === 'edge') {
          (graph as any)?.completeConnectToEdge?.(componentSnappedTarget.id, componentSnappedTarget.x, componentSnappedTarget.y);
        } else if (componentSnappedTarget.kind === 'edge_anchor') {
          (graph as any)?.completeConnectToNode?.(componentSnappedTarget.id);
        }
      } else {
        onBackgroundMouseUp?.();
      }
    }
  };
  React.useEffect(() => {
    if (!containerRef.current) return;
    // React Flow edges SVG typically lives at: div.react-flow__edges > svg
    const el = containerRef.current.querySelector('div.react-flow__edges > svg') as SVGElement | null;
    setEdgesLayer(el);
  }, [nodes, edges]);

  // In hand (grab) mode, make nodes/edges layers non-interactive so panning works anywhere
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const nodesLayer = root.querySelector('.react-flow__nodes') as HTMLElement | null;
    const edgesLayerDiv = root.querySelector('.react-flow__edges') as HTMLElement | null;
    const edgeLabelsLayer = root.querySelector('.react-flow__edge-labels') as HTMLElement | null;
    const prevNodesPE = nodesLayer?.style.pointerEvents || '';
    const prevEdgesPE = edgesLayerDiv?.style.pointerEvents || '';
    const prevEdgeLabelsPE = edgeLabelsLayer?.style.pointerEvents || '';
    if (grabMode) {
      if (nodesLayer) nodesLayer.style.pointerEvents = 'none';
      if (edgesLayerDiv) edgesLayerDiv.style.pointerEvents = 'none';
      if (edgeLabelsLayer) edgeLabelsLayer.style.pointerEvents = 'none';
    } else {
      if (nodesLayer) nodesLayer.style.pointerEvents = prevNodesPE || 'all';
      if (edgesLayerDiv) edgesLayerDiv.style.pointerEvents = prevEdgesPE || 'all';
      if (edgeLabelsLayer) edgeLabelsLayer.style.pointerEvents = prevEdgeLabelsPE || 'all';
    }
    return () => {
      if (nodesLayer) nodesLayer.style.pointerEvents = prevNodesPE;
      if (edgesLayerDiv) edgesLayerDiv.style.pointerEvents = prevEdgesPE;
      if (edgeLabelsLayer) edgeLabelsLayer.style.pointerEvents = prevEdgeLabelsPE;
    };
  }, [grabMode]);


  const onCanvasDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    const isNode = target.closest('.react-flow__node') !== null;
    const isEdge = target.closest('.react-flow__edge') !== null;

    const hasDataId = target.closest('[data-id]') !== null;

    if (isNode || isEdge || hasDataId) {
      return;
    }

    e.preventDefault();
    // Only allow double-click create when nothing is selected and not editing or connecting
    const anySelected = rf.getNodes().some((n: any) => n?.selected) || (graph as any)?.selectedEdgeId;
    const isEditingAny = Boolean((graph as any)?.isAnyNodeEditing);
    if (connectMode || anySelected || isEditingAny) {
      return;
    }
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

  const handleBackgroundMouseDownCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const isNode = !!target.closest('.react-flow__node');
    const isEdge = !!target.closest('.react-flow__edge');
    const isControl = !!target.closest('.react-flow__controls');
    const isMinimap = !!target.closest('.react-flow__minimap');
    const isLabel = !!target.closest('.react-flow__edge-labels');
    const isPane = !!target.closest('.react-flow__pane');
    const isOverlay = isLabel || isMinimap || isControl;
    // Do not clear selection on mousedown; only clear text selection
    if (!isNode && !isEdge && (isPane || isOverlay)) {
      try { window.getSelection()?.removeAllRanges(); } catch { }
    }
  };

  React.useEffect(() => {
    return;
  }, [graph, onBackgroundMouseUp]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      onPointerDown={(e) => {
        try {
          if (e.button === 1 && e.pointerType === 'mouse') {
            midPanRef.current = true;
            setPerfMode?.(true);
          }
        } catch { }
      }}
      onPointerUp={(e) => {
        try {
          if (midPanRef.current && e.button === 1) {
            midPanRef.current = false;
            setPerfMode?.(false);
          }
        } catch { }
      }}
      onPointerCancel={() => {
        try {
          if (midPanRef.current) {
            midPanRef.current = false;
            setPerfMode?.(false);
          }
        } catch { }
      }}
      onMouseDownCapture={handleBackgroundMouseDownCapture}
      onMouseMove={onCanvasMouseMove}
      onMouseLeave={() => graph.setHoveredNodeId?.(null)}
      onMouseUp={handleMouseUp}
      onDoubleClick={onCanvasDoubleClick}
      data-testid="graph-canvas-root"
    >
      {(() => {
        // Wrap changes to intercept removals and route through multiplayer delete
        const handleNodesChange = (changes: any[]) => {
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
        const handleEdgeClickInternal = (e: any, edge: any) => {
          if (grabMode) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.stopPropagation();
          deselectAllNodes();
          graph.setSelectedEdge?.(edge.id);
          onEdgeClick?.(e, edge);
        };

        const handleNodeClickInternal = (e: any, node: any) => {
          if (grabMode) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onNodeClick?.(e, node);
        };

        const handleNodeDragStartInternal = (e: any, node: any) => {
          onNodeDragStart?.(e, node);
          try {
            // Block dragging a node if any objection connected to an edge with this node as endpoint is being edited
            try {
              const edgesAll = rf.getEdges();
              const nodesAll = rf.getNodes();
              const relatedObjections = nodesAll.filter((n: any) => n.type === 'objection' && n.data?.parentEdgeId);
              for (const obj of relatedObjections) {
                const base = edgesAll.find((ed: any) => ed.id === obj.data.parentEdgeId);
                if (!base) continue;
                const isEndpoint = String(base.source) === node.id || String(base.target) === node.id;
                if (!isEndpoint) continue;
                const editors = (graph as any)?.getEditorsForNode?.(obj.id) || [];
                if (editors.length > 0) {
                  e?.preventDefault?.();
                  e?.stopPropagation?.();
                  toast.warning(`Locked by ${editors[0]?.name || 'another user'}`);
                  return;
                }
              }
            } catch { }

            if ((node as any)?.type === 'objection') {
              const allEdges = rf.getEdges();
              const objEdge = allEdges.find((ed: any) => (ed.type || '') === 'objection' && ed.source === node.id);
              if (objEdge) {
                const anchorId = String(objEdge.target || '');
                const anchor: any = rf.getNode(anchorId);
                if (anchor && anchor.type === 'edge_anchor') {
                  const parentEdgeId: string | undefined = anchor.data?.parentEdgeId;
                  if (parentEdgeId) {
                    graph.ensureEdgeAnchor?.(anchor.id, parentEdgeId, anchor.position?.x ?? 0, anchor.position?.y ?? 0);
                  }
                } else {
                  // Anchor not in local RF yet; derive parent edge id from target and ensure presence using midpoint
                  const parentEdgeId = anchorId.startsWith('anchor:') ? anchorId.slice('anchor:'.length) : null;
                  if (parentEdgeId) {
                    const base = allEdges.find((e: any) => e.id === parentEdgeId);
                    if (base) {
                      const src = rf.getNode(String(base.source));
                      const tgt = rf.getNode(String(base.target));
                      const midX = (((src as any)?.position?.x ?? 0) + ((tgt as any)?.position?.x ?? 0)) / 2;
                      const midY = (((src as any)?.position?.y ?? 0) + ((tgt as any)?.position?.y ?? 0)) / 2;
                      graph.ensureEdgeAnchor?.(anchorId, parentEdgeId, midX, midY);
                    }
                  }
                }
              }
            }
          } catch { }


        };

        return (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClickInternal}
            onPaneClick={(e) => {
              // If in select mode, clear selections. Otherwise, do nothing for clicks on the pane.
              if (selectMode) {
                if (Date.now() - (lastSelectionChangeRef.current || 0) < 200) return;
                try { graph.clearNodeSelection?.(); } catch { }
                try { graph.setSelectedEdge?.(null); } catch { }
                try { window.getSelection()?.removeAllRanges(); } catch { }
              } else if (connectMode) {
                onBackgroundMouseUp?.();
              }
            }}
            onEdgeClick={handleEdgeClickInternal}
            onNodeDragStart={handleNodeDragStartInternal}
            onNodeDrag={((_: any, node: any) => {
              try { graph.updateNodePosition?.(node.id, node.position?.x ?? 0, node.position?.y ?? 0); } catch { }
            })}
            onNodeDragStop={((e: any, node: any) => { try { onNodeDragStop?.(e, node); } catch { } try { graph.stopCapturing?.(); } catch { } })}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="w-full h-full bg-gray-50"
            style={{ willChange: 'transform' }}
            selectionOnDrag={selectMode}
            onEdgeMouseEnter={grabMode ? undefined : onEdgeMouseEnter}
            onEdgeMouseLeave={grabMode ? undefined : onEdgeMouseLeave}
            panOnDrag={selectMode ? false : (panOnDrag !== undefined ? panOnDrag : (grabMode ? [0, 1, 2] : [1]))}
            panOnScroll={panOnScroll !== undefined ? (panOnScroll as any) : true}
            zoomOnScroll={false}
            zoomOnDoubleClick={false}
            nodesDraggable={!connectMode && !grabMode}
            nodesConnectable={!grabMode}
            elementsSelectable={selectMode}
            nodesFocusable={selectMode}
            edgesFocusable={selectMode}
            onlyRenderVisibleElements={perfMode}
            selectionMode={SelectionMode.Partial}
            onSelectionChange={selectMode ? ({ nodes, edges }) => {
              try {
                if (Array.isArray(nodes)) {
                  const anySelected = nodes.some((n: any) => (n as any)?.selected);
                  if (anySelected) lastSelectionChangeRef.current = Date.now();
                }
                if (edges && edges.length > 0) {
                  if (suppressEdgeDeselectRef.current) return;
                  suppressEdgeDeselectRef.current = true;
                  const edgeChanges = edges.map(edge => ({ id: edge.id, type: 'select', selected: false }));
                  requestAnimationFrame(() => {
                    try { onEdgesChange?.(edgeChanges); } finally {
                      suppressEdgeDeselectRef.current = false;
                    }
                  });
                }
              } catch { }
            } : undefined}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            {!perfMode && <Controls />}
            <MiniMap nodeColor={() => '#dbeafe'} className="bg-white" />
          </ReactFlow>
        );
      })()}
      {/* Connect overlay: draw a line from anchor origin to cursor */}
      {connectMode && connectAnchorId && edgesLayer && createPortal((() => {
        const cursorFlow = connectCursor || { x: origin.x + 100, y: origin.y };
        const tx = snappedPosition?.x ?? cursorFlow.x;
        const ty = snappedPosition?.y ?? cursorFlow.y;
        return (
          <g className="react-flow__connection-preview" style={{ pointerEvents: 'none' }}>
            <defs>
              <marker id={`rf-preview-arrow-${connectAnchorId}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--sync-primary))" />
              </marker>
            </defs>
            <line x1={origin.x} y1={origin.y} x2={tx} y2={ty} stroke="hsl(var(--sync-primary))" strokeOpacity={0.95} strokeWidth={2.5} markerEnd={`url(#rf-preview-arrow-${connectAnchorId})`} />
          </g>
        );
      })(), edgesLayer)}
      <CursorOverlay cursors={cursors} />
      <OffscreenNeighborPreviews />
      {!grabMode && !perfMode && (
        <CursorReporter
          provider={provider}
          username={username}
          userColor={userColor}
          grabMode={Boolean(grabMode)}
          canWrite={canWrite ?? true}
          broadcastCursor={true}
        />
      )}
    </div>
  );
};
