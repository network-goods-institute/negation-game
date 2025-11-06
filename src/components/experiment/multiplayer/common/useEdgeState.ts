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
  data?: any;
}

export interface EdgeState {
  // Context menu state
  menuOpen: boolean;
  menuPos: { x: number; y: number };
  setMenuOpen: (open: boolean) => void;
  setMenuPos: (pos: { x: number; y: number }) => void;

  // Market interaction state
  quickBuyOpen: boolean;
  sidePanelOpen: boolean;
  clickPos: { x: number; y: number };
  setQuickBuyOpen: (open: boolean) => void;
  setSidePanelOpen: (open: boolean) => void;
  setClickPos: (pos: { x: number; y: number }) => void;

  // Hover and selection state
  isHovered: boolean;
  selected: boolean;
  setIsConnectHovered: (hovered: boolean) => void;

  // Position and geometry
  cx: number;
  cy: number;
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
    connectMode,
    beginConnectFromEdge,
    isConnectingFromNodeId,
    cancelConnect,
    completeConnectToEdge
  } = graphActions;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [quickBuyOpen, setQuickBuyOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [clickPos, setClickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isConnectHovered, setIsConnectHovered] = useState(false);

  const { sourceX, sourceY, targetX, targetY, source, target } = config || {};

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

  const isHovered = hoveredEdgeId === (config?.id || '') || (connectMode && isConnectHovered);
  const selected = useMemo(() => (selectedEdgeId || null) === (config?.id || ''), [selectedEdgeId, config?.id]);
  const edgeOpacity = useMemo(() => {
    return selected || isHovered ? 1 : 0.7;
  }, [selected, isHovered]);

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
    quickBuyOpen,
    sidePanelOpen,
    clickPos,
    setQuickBuyOpen,
    setSidePanelOpen,
    setClickPos,
    isHovered,
    selected,
    setIsConnectHovered,
    cx,
    cy,
    edgeOpacity,
    isHighFrequencyUpdates,
    sourceNode,
    targetNode,
    shouldRenderEllipses,
    graphActions,
    shouldRenderOverlay,
  };
};
