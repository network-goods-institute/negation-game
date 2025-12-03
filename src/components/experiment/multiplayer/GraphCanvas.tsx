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
import { MiniHoverStats } from './MiniHoverStats';
import { NodePriceOverlay } from './NodePriceOverlay';
import { EdgePriceOverlay } from './EdgePriceOverlay';
import { enrichWithMarketData, getDocIdFromURL, isMarketEnabled } from '@/utils/market/marketUtils';
import { dispatchMarketPanelClose } from '@/utils/market/marketEvents';
import { useUserHoldingsLite } from '@/hooks/market/useUserHoldingsLite';
import { useMarketMetaVersion } from '@/hooks/market/useMarketMetaVersion';
import { SnapLines } from './SnapLines';
import { Plus, Trash2 } from 'lucide-react';

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
  blurAllNodes?: number;
  forceSave?: () => Promise<void> | void;
  yMetaMap?: any;
  isMarketPanelVisible?: boolean;
}

type MarketNode = Node<{ market?: { price?: number; mine?: number; total?: number } }>;

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
  blurAllNodes = 0,
  forceSave,
  yMetaMap,
  isMarketPanelVisible = false,
}) => {
  const rf = useReactFlow();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const graph = useGraphActions();
  const [docId, setDocId] = React.useState<string | null>(null);
  React.useEffect(() => { try { setDocId(getDocIdFromURL() || null); } catch { setDocId(null); } }, []);
  const marketEnabled = process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === 'true';
  const userHoldingsLite = useUserHoldingsLite(marketEnabled ? docId : null, 5000);
  const marketMetaVersion = useMarketMetaVersion(yMetaMap as any, marketEnabled);
  const [edgesLayer, setEdgesLayer] = React.useState<SVGElement | null>(null);
  const suppressEdgeDeselectRef = React.useRef(false);
  const lastSelectionChangeRef = React.useRef<number>(0);
  const { perfMode } = usePerformanceMode();
  const { setPerfMode } = usePerformanceMode();
  const midPanRef = React.useRef(false);
  const copiedNodeIdRef = React.useRef<string | null>(null);
  const altCloneMapRef = React.useRef<Map<string, { dupId: string; origin: { x: number; y: number } }>>(new Map());
  const { origin, snappedPosition, snappedTarget: componentSnappedTarget } = useConnectionSnapping({
    connectMode: !!connectMode,
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
      const marketPrices: Record<string, number> | null = marketEnabled ? ((yMetaMap as any)?.get?.('market:prices') || null) : null;
      const marketHoldings: Record<string, string> | null = marketEnabled ? (userHoldingsLite.data || (yMetaMap as any)?.get?.('market:holdings') || null) : null;
      const marketTotals: Record<string, string> | null = marketEnabled ? ((yMetaMap as any)?.get?.('market:totals') || null) : null;
      const enriched = (edges as any[]).map((e) => {
        // Enrich with market data only if market is enabled
        if (marketEnabled) {
          e = enrichWithMarketData(e, marketPrices, marketHoldings, marketTotals, 'edge');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marketMetaVersion triggers intentional re-computation when market data changes
  }, [edges, graph, rf, userHoldingsLite.data, yMetaMap, marketEnabled, marketMetaVersion]);

  const nodesWithMarket = React.useMemo<MarketNode[]>(() => {
    try {
      const marketPrices: Record<string, number> | null = marketEnabled ? ((yMetaMap as any)?.get?.('market:prices') || null) : null;
      const marketHoldings: Record<string, string> | null = marketEnabled ? (userHoldingsLite.data || (yMetaMap as any)?.get?.('market:holdings') || null) : null;
      const marketTotals: Record<string, string> | null = marketEnabled ? ((yMetaMap as any)?.get?.('market:totals') || null) : null;
      const enriched = (nodes as any[]).map((n) => {
        if (marketEnabled) {
          return enrichWithMarketData(n, marketPrices, marketHoldings, marketTotals, 'node');
        }
        return n;
      });
      return enriched as MarketNode[];
    } catch {
      return nodes as MarketNode[];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marketMetaVersion triggers intentional re-computation when market data changes
  }, [nodes, userHoldingsLite.data, yMetaMap, marketEnabled, marketMetaVersion]);

  const nodePriceMap = React.useMemo(() => {
    const out: Record<string, number> = {};
    if (!marketEnabled) return out;
    try {
      const metaPrices: Record<string, number> | null = (yMetaMap as any)?.get?.('market:prices') || null;
      const priceSource = metaPrices && Object.keys(metaPrices).length ? metaPrices : null;
      const candidates = priceSource ? Object.entries(priceSource) : [];
      if (candidates.length) {
        const allowedIds = new Set(nodesWithMarket.map((n) => String(n.id)));
        for (const [id, price] of candidates) {
          const pNum = Number(price);
          if (Number.isFinite(pNum) && allowedIds.has(id)) {
            out[id] = pNum;
          }
        }
      } else {
        for (const n of nodesWithMarket as any[]) {
          const price = Number((n as any)?.data?.market?.price ?? NaN);
          if (Number.isFinite(price)) {
            out[String((n as any).id)] = price;
          }
        }
      }
    } catch { }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marketMetaVersion triggers intentional re-computation when market data changes
  }, [nodesWithMarket, yMetaMap, marketEnabled, marketMetaVersion]);

  const nodesForRender = React.useMemo(() => {
    try {
      if (canWrite) return nodesWithMarket;
      // Force-disable dragging for all nodes when read-only
      return (nodesWithMarket as any[]).map((n) => ({ ...n, draggable: false }));
    } catch {
      return nodesWithMarket;
    }
  }, [nodesWithMarket, canWrite]);

  // Custom hooks for managing complex logic
  useGraphKeyboardHandlers({ graph, copiedNodeIdRef });
  useGraphWheelHandler({ containerRef });
  const selectionSnapshotRef = React.useRef<string[]>([]);

  const {
    multiSelectMenuOpen,
    multiSelectMenuPos,
    handleMultiSelectContextMenu,
    handleDeleteSelectedNodes,
    handleAddPointToSelected,
    getAddPointLabel,
    setMultiSelectMenuOpen,
  } = useGraphContextMenu({ graph });

  const nodeHandlers = useGraphNodeHandlers({
    graph,
    grabMode,
    selectMode,
    onNodeClick,
    onNodeDragStart,
    onNodeDragStop,
    altCloneMapRef,
  });

  const {
    handleNodeClick: handleNodeClickInternal,
    handleNodeDragStart: handleNodeDragStartInternal,
    handleNodeDrag,
    handleNodeDragStop: handleNodeDragStopInternal,
    snapResult,
  } = nodeHandlers;

  const deselectAllNodes = React.useCallback(() => {
    try {
      (graph as any)?.clearNodeSelection?.();
    } catch { }
  }, [graph]);

  useKeyboardPanning({
    connectMode: !!connectMode,
    onCancelConnect: graph.cancelConnect,
    forceSave,
  });
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
    const isSelectionBox = !!target.closest('.react-flow__nodesselection');
    const isOverlay = isLabel || isMinimap || isControl;
    const isPanning = grabMode || e.button === 1;

    // If market panel is visible and user clicks the bare pane, close the panel via fade first
    // Don't trigger if clicking on the selection box (used for multi-select drag)
    // Don't close if user is panning (grabMode) or using middle mouse button
    if (isMarketPanelVisible && !connectMode && isPane && !isNode && !isEdge && !isOverlay && !isSelectionBox && !isPanning) {
      dispatchMarketPanelClose();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Do not clear selection on mousedown; only clear text selection
    if (!isNode && !isEdge && !isSelectionBox && (isPane || isOverlay)) {
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
      onMouseDownCapture={handleBackgroundMouseDownCapture}
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
      onMouseMove={onCanvasMouseMove}
      onMouseLeave={() => graph.setHoveredNodeId?.(null)}
      onMouseUp={handleMouseUp}
      onDoubleClick={onCanvasDoubleClick}
      data-testid="graph-canvas-root"
    >
      {process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === 'true' && Array.isArray(nodesForRender) && (
        <>
          <MiniHoverStats docId={docId} />
          <NodePriceOverlay nodes={nodesForRender as any} prices={nodePriceMap} />
          <EdgePriceOverlay edges={edgesForRender as any} />
        </>
      )}
      {(() => {
        // Wrap changes to intercept removals and route through multiplayer delete
        const handleNodesChange = (changes: any[]) => {
          const passthrough: any[] = [];
          let nodeSelected = false;
          for (const c of changes || []) {
            if (c?.type === 'remove' && c?.id) {
              try { graph.deleteNode?.(c.id); } catch { }
            } else if (c?.type === 'position' && (connectMode || nodeHandlers.finalizingSnap || (nodeHandlers.draggingActive && c?.dragging === false))) {
              // Block position updates during special modes, but allow dragging state to clear
              if (c?.dragging === false && (nodeHandlers.finalizingSnap || nodeHandlers.draggingActive)) {
                // Pass through a change that only updates the dragging flag, not position
                passthrough.push({ id: c.id, type: 'position', dragging: false });
              }
              // Otherwise ignore the position change entirely
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
            nodes={nodesForRender}
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
              // If market panel is visible, request panel to close with animation
              if (isMarketPanelVisible) {
                dispatchMarketPanelClose();
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
            className={`w-full h-full bg-gray-50 ${connectMode ? 'connect-mode' : ''}`}
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
            nodesDraggable={Boolean(canWrite) && !connectMode && !grabMode}
            nodesConnectable={!grabMode}
            elementsSelectable={selectMode}
            nodesFocusable={selectMode}
            edgesFocusable={selectMode}
            onlyRenderVisibleElements={perfMode}
            selectionMode={SelectionMode.Partial}
            onSelectionChange={selectMode ? ({ nodes, edges }) => {
              try {
                if (Array.isArray(nodes)) {
                  selectionSnapshotRef.current = nodes.filter((n: any) => (n as any)?.selected).map((n: any) => n.id);
                  const anySelected = selectionSnapshotRef.current.length > 0;
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
      {/* Snap lines for node dragging */}
      <SnapLines
        snappedX={snapResult?.snappedX ?? false}
        snappedY={snapResult?.snappedY ?? false}
        snapX={snapResult?.snapLineX ?? null}
        snapY={snapResult?.snapLineY ?? null}
        edgesLayer={edgesLayer}
      />
      <CursorOverlay cursors={cursors} />
      <OffscreenNeighborPreviews blurAllNodes={blurAllNodes} isMarketPanelVisible={isMarketPanelVisible} />
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
            label: getAddPointLabel(),
            icon: <Plus className="w-5 h-5" />,
            onClick: handleAddPointToSelected,
          },
          {
            label: 'Delete',
            icon: <Trash2 className="w-5 h-5" />,
            danger: true,
            onClick: handleDeleteSelectedNodes,
          },
        ]}
      />
    </div>
  );
};
