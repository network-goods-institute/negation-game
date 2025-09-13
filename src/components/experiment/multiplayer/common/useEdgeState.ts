import { useState, useEffect, useRef, useMemo } from 'react';
import { useGraphActions } from '../GraphContext';
import { useEdgePerformanceOptimization } from './useEdgePerformanceOptimization';

export interface EdgeStateConfig {
  id: string;
  sourceX?: number;
  sourceY?: number;
  targetX?: number;
  targetY?: number;
  source: string;
  target: string;
  data?: {
    relevance?: number;
  };
}

export interface EdgeState {
  // Context menu state
  menuOpen: boolean;
  menuPos: { x: number; y: number };
  setMenuOpen: (open: boolean) => void;
  setMenuPos: (pos: { x: number; y: number }) => void;

  // Hover and selection state
  isHovered: boolean;
  selected: boolean;

  // Position and geometry
  cx: number;
  cy: number;
  relevance: number;
  edgeOpacity: number;

  // Performance optimization data
  isHighFrequencyUpdates: boolean;
  sourceNode: any;
  targetNode: any;
  shouldRenderEllipses: boolean;

  // Graph actions
  graphActions: any;

  // Coordinate validation
  shouldRenderOverlay: boolean;
}

export const useEdgeState = (config?: EdgeStateConfig): EdgeState => {
  const graphActions = useGraphActions() as any;
  const {
    hoveredEdgeId,
    selectedEdgeId,
    setSelectedEdge,
    addObjectionForEdge,
    setHoveredEdge,
    updateEdgeAnchorPosition,
    deleteNode,
    updateEdgeRelevance,
    connectMode,
    beginConnectFromEdge,
    isConnectingFromNodeId,
    cancelConnect,
    completeConnectToEdge
  } = graphActions;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const { sourceX, sourceY, targetX, targetY, source, target, data } = config || {};

  const { isHighFrequencyUpdates, sourceNode, targetNode, shouldRenderEllipses } = useEdgePerformanceOptimization({
    sourceId: source || '',
    targetId: target || '',
    sourceX: sourceX ?? null,
    sourceY: sourceY ?? null,
    targetX: targetX ?? null,
    targetY: targetY ?? null
  });

  // Computed values
  const cx = useMemo(() => {
    return sourceX != null && targetX != null ? (sourceX + targetX) / 2 : 0;
  }, [sourceX, targetX]);

  const cy = useMemo(() => {
    return sourceY != null && targetY != null ? (sourceY + targetY) / 2 : 0;
  }, [sourceY, targetY]);

  const isHovered = hoveredEdgeId === (config?.id || '');
  const selected = useMemo(() => (selectedEdgeId || null) === (config?.id || ''), [selectedEdgeId, config?.id]);
  const relevance = useMemo(() => Math.max(1, Math.min(5, (data?.relevance ?? 3))), [data?.relevance]);
  const edgeOpacity = useMemo(() => selected || isHovered ? 1 : Math.max(0.3, Math.min(1, relevance / 5)), [selected, isHovered, relevance]);

  const shouldRenderOverlay = useMemo(
    () =>
      Number.isFinite(sourceX) &&
      Number.isFinite(sourceY) &&
      Number.isFinite(targetX) &&
      Number.isFinite(targetY),
    [sourceX, sourceY, targetX, targetY]
  );

  return {
    menuOpen,
    menuPos,
    setMenuOpen,
    setMenuPos,
    isHovered,
    selected,
    cx,
    cy,
    relevance,
    edgeOpacity,
    isHighFrequencyUpdates,
    sourceNode,
    targetNode,
    shouldRenderEllipses,
    graphActions,
    shouldRenderOverlay,
  };
};