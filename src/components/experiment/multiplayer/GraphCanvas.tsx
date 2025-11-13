import React from 'react';
import { createPortal } from 'react-dom';
import { ReactFlow, Background, Controls, MiniMap, Edge, Node, useReactFlow, SelectionMode } from '@xyflow/react';
import { CursorOverlay } from './CursorOverlay';
import { CursorReporter } from './CursorReporter';
import { nodeTypes, edgeTypes } from '@/components/experiment/multiplayer/componentRegistry';
import { WebsocketProvider } from 'y-websocket';
import { useGraphActions } from './GraphContext';
import OffscreenNeighborPreviews from './OffscreenNeighborPreviews';
import { useKeyboardPanning } from '@/hooks/experiment/multiplayer/useKeyboardPanning';
import { useConnectionSnapping } from '@/hooks/experiment/multiplayer/useConnectionSnapping';
import { usePerformanceMode } from './PerformanceContext';
import { ContextMenu } from './common/ContextMenu';
import { useGraphKeyboardHandlers } from '@/hooks/experiment/multiplayer/useGraphKeyboardHandlers';
import { useGraphWheelHandler } from '@/hooks/experiment/multiplayer/useGraphWheelHandler';
import { useGraphNodeHandlers } from '@/hooks/experiment/multiplayer/useGraphNodeHandlers';
import { useGraphContextMenu } from '@/hooks/experiment/multiplayer/useGraphContextMenu';
import { EdgeArrowMarkers } from './common/EdgeArrowMarkers';
import { SnapLines } from './SnapLines';

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
  mindchangeMode?: boolean;
  connectAnchorId?: string | null;
  onFlowMouseMove?: (flowX: number, flowY: number) => void;
  connectCursor?: { x: number; y: number } | null;
  onBackgroundMouseUp?: () => void;
  onBackgroundDoubleClick?: (flowX: number, flowY: number) => void;
  selectMode: boolean;
  blurAllNodes?: number;
  forceSave?: () => Promise<void> | void;
  yMetaMap?: any;
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
  mindchangeMode,
  connectAnchorId,
  onFlowMouseMove,
  connectCursor,
  onBackgroundMouseUp,
  onBackgroundDoubleClick,
  selectMode,
  blurAllNodes = 0,
  forceSave,
  yMetaMap,
}) => {
  const rf = useReactFlow();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const graph = useGraphActions();
  const [edgesLayer, setEdgesLayer] = React.useState<SVGElement | null>(null);
  const suppressEdgeDeselectRef = React.useRef(false);
  const lastSelectionChangeRef = React.useRef<number>(0);
  const { perfMode } = usePerformanceMode();
  const { setPerfMode } = usePerformanceMode();
  const midPanRef = React.useRef(false);
  const copiedNodeIdRef = React.useRef<string | null>(null);
  const altCloneMapRef = React.useRef<Map<string, { dupId: string; origin: { x: number; y: number } }>>(new Map());

  const { origin, snappedPosition, snappedTarget: componentSnappedTarget } = useConnectionSnapping({
    connectMode: !!connectMode && !mindchangeMode,
    connectAnchorId,
    connectCursor: connectCursor ?? null,
    edgesLayer,
    containerRef,
  });

  const edgesForRender = React.useMemo(() => {
    try {
      const overlayId = (graph as any)?.overlayActiveEdgeId as (string | null);
      const visible = new Set<string>();
      if (overlayId) visible.add(String(overlayId));
      const enriched = (edges as any[]).map((e) => {
        const key = `mindchange:${e.id}`;
        const payload = yMetaMap?.get?.(key);
        if (payload && typeof payload === 'object') {
          const prevUser = (e as any)?.data?.mindchange?.userValue;
          const mc = {
            forward: { average: Number((payload as any).forward || 0), count: Number((payload as any).forwardCount || 0) },
            backward: { average: Number((payload as any).backward || 0), count: Number((payload as any).backwardCount || 0) },
            ...(prevUser ? { userValue: prevUser } : {}),
          } as any;
          return { ...e, data: { ...(e.data || {}), mindchange: mc } } as any;
        }
        return e;
      });
      const getNodeRect = (id: string) => {
        try {
          const n = rf.getNode(id) as any;
          if (!n) return null;
          const w = Number(n?.width ?? n?.measured?.width ?? n?.style?.width ?? 0) || 0;
          const h = Number(n?.height ?? n?.measured?.height ?? n?.style?.height ?? 0) || 0;
          const cx = Number(n?.position?.x ?? 0) + w / 2;
          const cy = Number(n?.position?.y ?? 0) + h / 2;
          return { cx, cy, w, h };
        } catch {
          return null;
        }
      };
      return enriched;
    } catch {
      return edges;
    }
  }, [edges, graph, yMetaMap, rf]);

  // Custom hooks for managing complex logic
  useGraphKeyboardHandlers({ graph, copiedNodeIdRef });
  useGraphWheelHandler({ containerRef });

  const {
    multiSelectMenuOpen,
    multiSelectMenuPos,
    handleMultiSelectContextMenu,
    handleDeleteSelectedNodes,
    setMultiSelectMenuOpen,
  } = useGraphContextMenu({ graph });

  const {
    handleNodeClick: handleNodeClickInternal,
    handleNodeDragStart: handleNodeDragStartInternal,
    handleNodeDrag,
    handleNodeDragStop: handleNodeDragStopInternal,
    snapResult,
    finalizingSnap,
    draggingActive,
  } = useGraphNodeHandlers({
    graph,
    grabMode,
    selectMode,
    onNodeClick,
    onNodeDragStart,
    onNodeDragStop,
    altCloneMapRef,
  });

  const deselectAllNodes = React.useCallback(() => {
    try {
      (graph as any)?.clearNodeSelection?.();
    } catch { }
  }, [graph]);

  useKeyboardPanning({
    connectMode: !!connectMode && !mindchangeMode,
    onCancelConnect: graph.cancelConnect,
    forceSave,
  });
  React.useEffect(() => {
    if (!(connectMode && !mindchangeMode) || !connectAnchorId || !onFlowMouseMove) return;
    const handler = (e: MouseEvent) => {
      const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onFlowMouseMove(p.x, p.y);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [connectMode, mindchangeMode, connectAnchorId, onFlowMouseMove, rf]);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!(connectMode && !mindchangeMode) || !connectAnchorId || !onFlowMouseMove) return;
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    onFlowMouseMove(p.x, p.y);
  };
  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!(connectMode && !mindchangeMode) || !connectAnchorId) return;

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

    // In normal mode, nodes layer must not block the pane; edges remain interactive
    // In grab mode, disable interaction on all layers for panning
    if (grabMode) {
      if (nodesLayer) nodesLayer.style.pointerEvents = 'none';
      if (edgesLayerDiv) edgesLayerDiv.style.pointerEvents = 'none';
      if (edgeLabelsLayer) edgeLabelsLayer.style.pointerEvents = 'none';
    } else {
      if (nodesLayer) nodesLayer.style.pointerEvents = 'none';
      if (edgesLayerDiv) edgesLayerDiv.style.pointerEvents = 'all';
      if (edgeLabelsLayer) edgeLabelsLayer.style.pointerEvents = 'none';
    }
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
      onContextMenu={handleMultiSelectContextMenu}
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
            } else if (c?.type === 'position' && (connectMode || mindchangeMode || finalizingSnap || (draggingActive && c?.dragging === false))) {
              // Ignore incidental position changes while connecting, mindchange mode, during snap finalization,
              // and the final unsnapped ReactFlow update at drag end (c.dragging === false) while we manage snapping
              continue;
            } else if (c?.type === 'position' && c?.id && altCloneMapRef.current.has(String(c.id))) {
              const mapping = altCloneMapRef.current.get(String(c.id));
              if (mapping) {
                const cloneChange = { ...c, id: mapping.dupId };
                passthrough.push(cloneChange);
                continue;
              }
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

        return (
          <ReactFlow
            nodes={nodes}
            edges={edgesForRender}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClickInternal}
            onPaneClick={(_) => {
              // In connect mode, route to background mouse up handler
              if (connectMode) {
                onBackgroundMouseUp?.();
                return;
              }
              // Clear edge selection and hover immediately, but delay node deselection to avoid race after selection changes
              const timeSinceLastSelection = Date.now() - (lastSelectionChangeRef.current || 0);
              try { graph.setSelectedEdge?.(null); } catch { }
              try { graph.setHoveredEdge?.(null); } catch { }
              if (timeSinceLastSelection >= 200) {
                try { graph.clearNodeSelection?.(); } catch { }
              }
              try { window.getSelection()?.removeAllRanges(); } catch { }
              try { graph.blurNodesImmediately?.(); } catch { }
            }}
            onEdgeClick={handleEdgeClickInternal}
            onNodeDragStart={handleNodeDragStartInternal}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={handleNodeDragStopInternal}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className={`w-full h-full bg-gray-50 ${(connectMode && !mindchangeMode) ? 'connect-mode' : ''}`}
            style={{ willChange: 'transform' }}
            selectionOnDrag={selectMode}
            onEdgeMouseEnter={grabMode ? undefined : onEdgeMouseEnter}
            onEdgeMouseLeave={grabMode ? undefined : onEdgeMouseLeave}
            panOnDrag={selectMode ? [1, 2] : (panOnDrag !== undefined ? panOnDrag : (grabMode ? [0, 1, 2] : [1]))}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnDoubleClick={false}
            minZoom={0.1}
            maxZoom={10}
            nodesDraggable={!connectMode && !grabMode && !mindchangeMode}
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
      {(connectMode && !mindchangeMode) && connectAnchorId && edgesLayer && createPortal((() => {
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
      {/* Global arrow markers for mindchange edges */}
      {edgesLayer && createPortal(<EdgeArrowMarkers />, edgesLayer)}
      {/* Snap lines for node dragging */}
      <SnapLines
        snappedX={snapResult?.snappedX ?? false}
        snappedY={snapResult?.snappedY ?? false}
        snapX={snapResult?.snapLineX ?? null}
        snapY={snapResult?.snapLineY ?? null}
        edgesLayer={edgesLayer}
      />
      <CursorOverlay cursors={cursors} />
      <OffscreenNeighborPreviews blurAllNodes={blurAllNodes} />
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
      <ContextMenu
        open={multiSelectMenuOpen}
        x={multiSelectMenuPos.x}
        y={multiSelectMenuPos.y}
        onClose={() => setMultiSelectMenuOpen(false)}
        items={[
          {
            label: 'Delete selected',
            danger: true,
            onClick: handleDeleteSelectedNodes,
          },
        ]}
      />
    </div>
  );
};
