import React, { useMemo } from 'react';
import { EdgeProps, getBezierPath, getStraightPath, Position, useStore, Edge } from '@xyflow/react';
import { EdgeOverlay } from './EdgeOverlay';
import { ContextMenu } from './ContextMenu';
import { EdgeMidpointControl } from './EdgeMidpointControl';
import { EdgeInteractionOverlay } from './EdgeInteractionOverlay';
import { EdgeMaskDefs } from './EdgeMaskDefs';
import { useEdgeState } from './useEdgeState';
import { useEdgeNodeMasking } from './useEdgeNodeMasking';
import { useStrapGeometry } from './EdgeStrapGeometry';
import { EDGE_CONFIGURATIONS, EdgeType } from './EdgeConfiguration';
import { edgeIsObjectionStyle } from './edgeStyle';
import { usePerformanceMode } from '../PerformanceContext';
import { computeMidpointBetweenBorders, getTrimmedLineCoords } from '@/utils/experiment/multiplayer/edgePathUtils';
import { getHalfBezierPaths } from '@/utils/experiment/multiplayer/bezierSplit';
import { EdgeSelectionHighlight } from './EdgeSelectionHighlight';
import { MainEdgeRenderer } from './MainEdgeRenderer';
import { getMarkerIdForEdgeType } from './EdgeArrowMarkers';
import { getTargetVoteIds, normalizeVoteIds } from './edgeVotes';
import { computeDashOffset } from './dashUtils';
import { useAtomValue } from 'jotai';
import { marketOverlayStateAtom, marketOverlayZoomThresholdAtom, computeSide } from '@/atoms/marketOverlayAtom';
import { isMarketEnabled } from '@/utils/market/marketUtils';

export interface BaseEdgeProps extends EdgeProps {
  edgeType: EdgeType;
}

const votesEqual = (a?: any[] | null, b?: any[] | null) => {
  if (a === b) return true;
  if (!a || !b) return (!a || a.length === 0) && (!b || b.length === 0);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const BaseEdgeImpl: React.FC<BaseEdgeProps> = (props) => {
  const config = EDGE_CONFIGURATIONS[props.edgeType];
  const { visual, behavior } = config;

  const sourceX = (props as any).sourceX;
  const sourceY = (props as any).sourceY;
  const targetX = (props as any).targetX;
  const targetY = (props as any).targetY;

  const edgeState = useEdgeState({
    id: props.id as string,
    sourceX: (props as any).sourceX,
    sourceY: (props as any).sourceY,
    targetX: (props as any).targetX,
    targetY: (props as any).targetY,
    source: (props as any).source,
    target: (props as any).target,
    data: (props as any).data,
  });

  const {
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
  } = edgeState;

  const {
    setSelectedEdge,
    addObjectionForEdge,
    setHoveredEdge,
    updateEdgeType,
    deleteNode,
    connectMode,
    grabMode,
    beginConnectFromEdge,
    completeConnectToEdge,
    currentUserId,
  } = graphActions;

  const effectiveUserId = currentUserId || '';

  const parentEdgeId = props.edgeType === 'objection'
    ? String(((targetNode as any)?.data?.parentEdgeId) || '')
    : '';

  const parentEdgeVotes = useStore(
    useMemo(
      () => (state: any) => {
        if (!parentEdgeId) return [] as any[];
        const parentEdge = (state.edges as Edge[] | undefined)?.find(
          (edge: Edge) => String((edge as any).id) === parentEdgeId
        );
        return ((parentEdge as any)?.data?.votes as any[]) || [];
      },
      [parentEdgeId]
    ),
    votesEqual
  );

  const sourceVotes = ((sourceNode as any)?.data?.votes) || [];
  const edgeVotes = ((props as any).data?.votes) || [];
  const sourceNormalizedVotes = normalizeVoteIds(sourceVotes);
  const targetNormalizedVotes = useMemo(() => {
    const votes = ((targetNode as any)?.data?.votes) || [];
    return getTargetVoteIds({
      edgeType: props.edgeType,
      targetVotes: votes,
      parentEdgeVotes,
    });
  }, [props.edgeType, targetNode, parentEdgeVotes]);
  const edgeNormalizedVotes = normalizeVoteIds(edgeVotes);
  const sourceHasMyVote = effectiveUserId ? sourceNormalizedVotes.includes(effectiveUserId) : false;
  const targetHasMyVote = effectiveUserId ? targetNormalizedVotes.includes(effectiveUserId) : false;
  const edgeHasMyVote = effectiveUserId ? edgeNormalizedVotes.includes(effectiveUserId) : false;
  const edgeOthersVotes = effectiveUserId
    ? edgeNormalizedVotes.filter((v: string) => v !== effectiveUserId)
    : edgeNormalizedVotes;
  const edgeHasOthersVotes = edgeOthersVotes.length > 0;
  const sourceOthersVotes = effectiveUserId
    ? sourceNormalizedVotes.filter((v: string) => v !== effectiveUserId)
    : sourceNormalizedVotes;
  const targetOthersVotes = effectiveUserId
    ? targetNormalizedVotes.filter((v: string) => v !== effectiveUserId)
    : targetNormalizedVotes;
  const sourceHasOthersVotes = sourceOthersVotes.length > 0;
  const targetHasOthersVotes = targetOthersVotes.length > 0;

  const maskingData = useEdgeNodeMasking(sourceNode, targetNode);

  const { perfMode } = usePerformanceMode();
  const lightMode = (perfMode || grabMode) && !selected && !isHovered && !connectMode;

  const [, , zoom] = useStore((s: any) => s.transform);
  const overlayState = useAtomValue(marketOverlayStateAtom);
  const threshold = useAtomValue(marketOverlayZoomThresholdAtom);
  const marketEnabled = isMarketEnabled();
  const side = useMemo(() => {
    if (!marketEnabled) return 'TEXT';
    let s = computeSide(overlayState);
    if (overlayState === 'AUTO_TEXT' || overlayState === 'AUTO_PRICE') {
      s = zoom <= (threshold ?? 0.6) ? 'PRICE' : 'TEXT';
    }
    return s;
  }, [overlayState, zoom, threshold, marketEnabled]);
  const showPriceMode = marketEnabled && side === 'PRICE';

  const strapGeometry = useStrapGeometry(
    (visual.useStrap && !lightMode) ? {
      sourceX: sourceX ?? 0,
      sourceY: sourceY ?? 0,
      targetX: targetX ?? 0,
      targetY: targetY ?? 0,
      strength: 0.5,
    } : null
  );

  // Determine if either endpoint is currently being dragged (or positions are updating at high frequency)
  const sourceDragging = Boolean((sourceNode as any)?.dragging);
  const targetDragging = Boolean((targetNode as any)?.dragging);
  const endpointDragging = Boolean(sourceDragging || targetDragging || edgeState.isHighFrequencyUpdates);
  const suppressReason = endpointDragging ? (sourceDragging ? 'source-dragging' : (targetDragging ? 'target-dragging' : 'high-frequency')) : undefined;

  const [pathD, labelX, labelY] = useMemo(() => {
    if (visual.useBezier) {
      const curvature = (behavior.simplifyDuringDrag && isHighFrequencyUpdates) ? 0 : (visual.curvature ?? 0.35);

      let sourcePosition = (props as any).sourcePosition;
      let targetPosition = (props as any).targetPosition;

      if (props.edgeType === 'objection') {
        const objectionY = sourceNode?.position?.y ?? 0;
        const anchorY = targetNode?.position?.y ?? 0;
        // Align bezier orientation with MainEdgeRenderer and GraphUpdater
        sourcePosition = objectionY < anchorY ? Position.Bottom : Position.Top;
        targetPosition = objectionY > anchorY ? Position.Bottom : Position.Top;
      }

      return getBezierPath({
        sourceX: sourceX ?? 0,
        sourceY: sourceY ?? 0,
        sourcePosition,
        targetX: targetX ?? 0,
        targetY: targetY ?? 0,
        targetPosition,
        curvature,
      });
    } else {
      const [path, x, y] = getStraightPath({
        sourceX: sourceX ?? 0,
        sourceY: sourceY ?? 0,
        targetX: targetX ?? 0,
        targetY: targetY ?? 0,
      });
      return [path, x, y];
    }
  }, [sourceX, sourceY, targetX, targetY, visual.useBezier, visual.curvature, behavior.simplifyDuringDrag, isHighFrequencyUpdates, props, sourceNode, targetNode]);

  const halfBezierPaths = useMemo(() => {
    if (props.edgeType !== 'objection' || !visual.useBezier || !pathD) return null;
    return getHalfBezierPaths(pathD);
  }, [props.edgeType, visual.useBezier, pathD]);

  const halfBezierLengths = useMemo(() => {
    if (!halfBezierPaths) return { first: null as number | null, second: null as number | null };
    if (typeof document === 'undefined') return { first: null as number | null, second: null as number | null };
    const measure = (d: string) => {
      try {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        return path.getTotalLength();
      } catch {
        return null;
      }
    };
    return {
      first: measure(halfBezierPaths.firstHalf),
      second: measure(halfBezierPaths.secondHalf),
    };
  }, [halfBezierPaths]);

  const sourceHalfBezierPath = halfBezierPaths?.firstHalf ?? '';
  const targetHalfBezierPath = halfBezierPaths?.secondHalf ?? '';

  const [midXBetweenBorders, midYBetweenBorders] = useMemo(() => {
    return computeMidpointBetweenBorders(sourceNode, targetNode, labelX, labelY);
  }, [sourceNode, targetNode, labelX, labelY]);

  const mindchangeRenderConfig = { mode: 'normal', markerStart: null, markerEnd: null, markerId: null };

  // Only read market data if market feature is enabled
  const infl = marketEnabled ? Number(((props as any).data?.market?.influence) ?? NaN) : NaN;
  const srcMine = marketEnabled ? Number((sourceNode as any)?.data?.market?.mine ?? 0) : 0;
  const tgtMine = marketEnabled ? Number((targetNode as any)?.data?.market?.mine ?? 0) : 0;
  const marketPrice = marketEnabled ? Number(((props as any).data?.market?.price) ?? NaN) : NaN;
  const edgeTypeLocal = props.edgeType;
  const marketMarkers = useMemo(() => {
    if (!marketEnabled) return { start: undefined as string | undefined, end: undefined as string | undefined };
    try {
      const localInfl = infl;
      if (Number.isNaN(localInfl)) return { start: undefined as string | undefined, end: undefined as string | undefined };
      const localSrcMine = srcMine;
      const localTgtMine = tgtMine;
      if (!(localSrcMine > 0 || localTgtMine > 0)) return { start: undefined, end: undefined };
      const tau = 0.2;
      const markerId = getMarkerIdForEdgeType(edgeTypeLocal) || undefined;
      if (!markerId) return { start: undefined, end: undefined };
      if (localInfl > tau) return { start: undefined, end: `url(#${markerId})` };
      if (localInfl < -tau) return { start: `url(#${markerId})`, end: undefined };
      return { start: undefined, end: undefined };
    } catch {
      return { start: undefined as string | undefined, end: undefined as string | undefined };
    }
  }, [marketEnabled, infl, srcMine, tgtMine, edgeTypeLocal]);

  const [bidirectionalLabelX, bidirectionalLabelY] = useMemo(() => {
    if (mindchangeRenderConfig.mode !== 'bidirectional' || !visual.useBezier) {
      return [null, null];
    }

    const sx = sourceX ?? 0;
    const sy = sourceY ?? 0;
    const tx = targetX ?? 0;
    const ty = targetY ?? 0;
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const perpX = (-dy / len) * 4;
    const perpY = (dx / len) * 4;

    const f = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY, sourceNode, targetNode);
    const b = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY, sourceNode, targetNode);

    let sourcePosition = (props as any).sourcePosition;
    let targetPosition = (props as any).targetPosition;
    if (props.edgeType === 'objection') {
      const objectionY = sourceNode?.position?.y ?? 0;
      const anchorY = targetNode?.position?.y ?? 0;
      sourcePosition = objectionY < anchorY ? Position.Bottom : Position.Top;
      targetPosition = objectionY > anchorY ? Position.Bottom : Position.Top;
    }

    const curvature = visual.curvature ?? 0.35;

    const [, fLabelX, fLabelY] = getBezierPath({
      sourceX: f.fromX,
      sourceY: f.fromY,
      sourcePosition,
      targetX: f.toX,
      targetY: f.toY,
      targetPosition,
      curvature,
    });

    const [, bLabelX, bLabelY] = getBezierPath({
      sourceX: b.toX,
      sourceY: b.toY,
      sourcePosition: targetPosition,
      targetX: b.fromX,
      targetY: b.fromY,
      targetPosition: sourcePosition,
      curvature,
    });

    return [(fLabelX + bLabelX) / 2, (fLabelY + bLabelY) / 2];
  }, [mindchangeRenderConfig.mode, visual.useBezier, visual.curvature, sourceX, sourceY, targetX, targetY, sourceNode, targetNode, props]);

  const actualLabelX = (
    bidirectionalLabelX
    ?? (props.edgeType === 'objection' ? labelX : midXBetweenBorders)
    ?? labelX
    ?? cx
  ) as number;
  const actualLabelY = (
    bidirectionalLabelY
    ?? (props.edgeType === 'objection' ? labelY : midYBetweenBorders)
    ?? labelY
    ?? cy
  ) as number;

  const edgeStyles = useMemo(() => {
    const width = visual.strokeWidth;
    let marketWidth = width;
    try {
      const mp = marketPrice;
      // Only apply market-based width when in PRICE mode
      if (showPriceMode && Number.isFinite(mp)) {
        // Log-scaled emphasis: 0 -> ~1.5px, 1 -> ~11.5px; obvious visual tie to price
        const p = Math.max(0, Math.min(1, Number(mp)));
        const strength = Math.log1p(99 * p) / Math.log(100); // 0..1 with log curve
        const strongWidth = 1.5 + 10 * strength;
        marketWidth = Math.max(width, strongWidth);
      }
    } catch { }
    const baseStyle = {
      stroke: visual.stroke,
      strokeWidth: marketWidth,
    } as const;

    if (visual.strokeDasharray) {
      if (edgeTypeLocal === 'objection') {
        const useDotted = edgeIsObjectionStyle(targetNode?.type);
        return {
          ...baseStyle,
          strokeDasharray: useDotted ? visual.strokeDasharray : undefined,
        };
      } else {
        return {
          ...baseStyle,
          strokeDasharray: visual.strokeDasharray,
        };
      }
    }

    return baseStyle;
  }, [visual, edgeTypeLocal, targetNode, marketPrice, showPriceMode]);

  const edgeStylesWithPointer = useMemo(() => {
    return grabMode ? { ...edgeStyles, pointerEvents: 'none' as any } : edgeStyles;
  }, [edgeStyles, grabMode]);

  // Selection overlay stroke should scale with actual edge width to avoid looking outdated
  const overlayStrokeWidth = Math.max(6, Math.round(Number((edgeStyles as any)?.strokeWidth ?? 2)) + 4);

  const mindchangeActive = false;

  const hasMarketPrice = marketPrice != null && Number.isFinite(marketPrice);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEdge?.(props.id as string);

    // Always open the delete/context menu on right-click
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  const handleEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (connectMode) {
      const midpoint = { x: (labelX ?? cx), y: (labelY ?? cy) };
      const anchorId = graphActions.isConnectingFromNodeId as string | null;
      if (!anchorId) {
        beginConnectFromEdge?.(props.id as string, midpoint);
      } else {
        completeConnectToEdge?.(props.id as string, midpoint.x, midpoint.y);
      }
      return;
    }
    if (marketEnabled && hasMarketPrice && (props.edgeType === 'support' || props.edgeType === 'negation' || props.edgeType === 'objection')) {
      setClickPos({ x: e.clientX, y: e.clientY });
      setQuickBuyOpen(true);
      setSelectedEdge?.(props.id as string);
      return;
    }
    graphActions.clearNodeSelection?.();
    setSelectedEdge?.(props.id as string);
  };

  const handleAddObjection = () => {
    graphActions.clearNodeSelection?.();
    addObjectionForEdge(props.id as string, actualLabelX, actualLabelY);
    setHoveredEdge(null);
    setSelectedEdge?.(null);
  };

  const sHidden = !!(sourceNode as any)?.data?.hidden;
  const tHidden = !!(targetNode as any)?.data?.hidden;
  const showAffordance = !(sHidden || tHidden);

  return (
    <>
      <g style={{ opacity: edgeOpacity, pointerEvents: grabMode ? 'none' : undefined }}>
        {(!lightMode) && (
          <EdgeMaskDefs
            edgeId={props.id as string}
            maskingData={maskingData}
            sourceNode={sourceNode}
            targetNode={targetNode}
            shouldRenderEllipses={shouldRenderEllipses}
            gradientConfig={visual.gradientStops ? {
              id: visual.gradientId!,
              stops: visual.gradientStops,
            } : undefined}
          />
        )}

        {/* Others' votes glow - centered on edge label, extends to nodes only if BOTH edge AND node have votes */}
        {edgeHasOthersVotes && (() => {
          const centerX = actualLabelX;
          const centerY = actualLabelY;
          const intensity = Math.min(0.85, 0.4 + edgeOthersVotes.length * 0.15);
          const size = edgeHasMyVote ? 18 : 14;
          const strokeWidth = edgeHasMyVote ? 10 : 8;
          const extendToSource = edgeHasOthersVotes && sourceHasOthersVotes;
          const extendToTarget = edgeHasOthersVotes && targetHasOthersVotes;
          const isObjection = props.edgeType === 'objection';

          const color = '#78716c';
          const strokeStyle = `url(#edge-hatch-${props.id})`;
          const lineOpacity = intensity * 0.85;

          return (
            <>
              <defs>
                <pattern
                  id={`edge-hatch-${props.id}`}
                  patternUnits="userSpaceOnUse"
                  width="4"
                  height="4"
                  patternTransform="rotate(60)"
                >
                  <line x1="0" y1="0" x2="0" y2="4" stroke={color} strokeWidth="1" />
                </pattern>
              </defs>

              {extendToSource && (
                isObjection && visual.useBezier ? (
                  <path
                    d={sourceHalfBezierPath}
                    stroke={strokeStyle}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    opacity={lineOpacity}
                    className="pointer-events-none"
                  />
                ) : (
                  <line
                    x1={sourceX}
                    y1={sourceY}
                    x2={centerX}
                    y2={centerY}
                    stroke={strokeStyle}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    opacity={lineOpacity}
                    className="pointer-events-none"
                  />
                )
              )}

              {extendToTarget && (
                isObjection && visual.useBezier ? (
                  <path
                    d={targetHalfBezierPath}
                    stroke={strokeStyle}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    opacity={lineOpacity}
                    className="pointer-events-none"
                  />
                ) : (
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={targetX}
                    y2={targetY}
                    stroke={strokeStyle}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    opacity={lineOpacity}
                    className="pointer-events-none"
                  />
                )
              )}

              <circle
                cx={centerX}
                cy={centerY}
                r={size}
                fill={`url(#edge-hatch-${props.id})`}
                opacity={intensity}
                className="pointer-events-none"
              />
            </>
          );
        })()}

        <g mask={`url(#edge-mask-${props.id})`}>
          {(visual.useStrap && strapGeometry && mindchangeRenderConfig.mode === 'normal' && !mindchangeRenderConfig.markerStart && !mindchangeRenderConfig.markerEnd) && (
            <>
              <path d={strapGeometry.path} fill={`url(#${visual.gradientId})`} />
              <path d={strapGeometry.path} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
            </>
          )}

          <EdgeSelectionHighlight
            selected={selected}
            shouldRenderOverlay={shouldRenderOverlay}
            edgeId={props.id as string}
            useBezier={visual.useBezier ?? false}
            curvature={visual.curvature}
            sourceX={sourceX ?? 0}
            sourceY={sourceY ?? 0}
            targetX={targetX ?? 0}
            targetY={targetY ?? 0}
            sourceNode={sourceNode}
            targetNode={targetNode}
            edgeType={props.edgeType}
            pathD={pathD}
            overlayStrokeWidth={overlayStrokeWidth}
          />

          {shouldRenderOverlay && connectMode && isHovered && !selected && (
            visual.useBezier ? (
              <path d={pathD} stroke="hsl(var(--sync-primary))" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.8} strokeDasharray="8 4" />
            ) : (
              <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="hsl(var(--sync-primary))" strokeWidth={6} strokeLinecap="round" opacity={0.8} strokeDasharray="8 4" />
            )
          )}


          <MainEdgeRenderer
            useBezier={visual.useBezier ?? false}
            curvature={visual.curvature}
            sourceX={sourceX ?? 0}
            sourceY={sourceY ?? 0}
            targetX={targetX ?? 0}
            targetY={targetY ?? 0}
            sourceNode={sourceNode}
            targetNode={targetNode}
            edgeType={props.edgeType}
            edgeStylesWithPointer={edgeStylesWithPointer}
            props={props}
            interactionWidth={behavior.interactionWidth}
            label={visual.label}
            labelStyle={visual.labelStyle}
            labelX={actualLabelX}
            labelY={actualLabelY}
          />
        </g>

        {/* Emerald highlight for my vote on edge - extends to nodes only if BOTH edge AND node have my vote */}
        {edgeHasMyVote && (() => {
          const centerX = actualLabelX;
          const centerY = actualLabelY;
          const extendToSource = edgeHasMyVote && sourceHasMyVote;
          const extendToTarget = edgeHasMyVote && targetHasMyVote;
          const isObjection = props.edgeType === 'objection';

          let dashArray;
          if (props.edgeType === 'negation') {
            dashArray = '6,6';
          } else if (isObjection) {
            const useDotted = edgeIsObjectionStyle(targetNode?.type);
            if (useDotted) {
              dashArray = '8,4';
            }
          }

          const emeraldStyle = { filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))' };
          const dashedEmeraldStyle = dashArray ? { ...emeraldStyle, strokeDasharray: dashArray, strokeLinecap: 'butt' as const } : emeraldStyle;

          const emeraldDashOffset = dashArray
            ? computeDashOffset(halfBezierLengths.first, dashArray)
            : undefined;
          const emeraldTargetStyle = emeraldDashOffset != null
            ? { ...dashedEmeraldStyle, strokeDashoffset: emeraldDashOffset }
            : dashedEmeraldStyle;

          return (
            <>
              {extendToSource && (
                isObjection && visual.useBezier && sourceHalfBezierPath ? (
                  <path
                    d={sourceHalfBezierPath}
                    stroke="#10b981"
                    strokeWidth={4}
                    fill="none"
                    opacity={0.75}
                    className="pointer-events-none"
                    style={dashedEmeraldStyle}
                  />
                ) : (
                  <line
                    x1={sourceX}
                    y1={sourceY}
                    x2={centerX}
                    y2={centerY}
                    stroke="#10b981"
                    strokeWidth={4}
                    opacity={0.75}
                    className="pointer-events-none"
                    style={dashedEmeraldStyle}
                  />
                )
              )}
              {extendToTarget && (
                isObjection && visual.useBezier && targetHalfBezierPath ? (
                  <path
                    d={targetHalfBezierPath}
                    stroke="#10b981"
                    strokeWidth={4}
                    fill="none"
                    opacity={0.75}
                    className="pointer-events-none"
                    style={emeraldTargetStyle}
                  />
                ) : (
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={targetX}
                    y2={targetY}
                    stroke="#10b981"
                    strokeWidth={4}
                    opacity={0.75}
                    className="pointer-events-none"
                    style={dashedEmeraldStyle}
                  />
                )
              )}
              <circle
                cx={centerX}
                cy={centerY}
                r={11}
                fill="#10b981"
                opacity={0.8}
                className="pointer-events-none"
                style={emeraldStyle}
              />
            </>
          );
        })()}
      </g>


      {!grabMode && (
        <EdgeInteractionOverlay
          shouldRender={shouldRenderOverlay && !endpointDragging}
          pathD={visual.useBezier ? pathD : undefined}
          sourceX={visual.useBezier ? undefined : sourceX}
          sourceY={visual.useBezier ? undefined : sourceY}
          targetX={visual.useBezier ? undefined : targetX}
          targetY={visual.useBezier ? undefined : targetY}
          onEdgeClick={handleEdgeClick}
          onContextMenu={handleContextMenu}
          onMouseEnter={() => {
            setIsConnectHovered(true);
            try { (graphActions as any)?.setHoveredEdge?.(props.id as string); } catch { }
            try { (graphActions as any)?.setOverlayActiveEdge?.(props.id as string); } catch { }
          }}
          onMouseLeave={() => {
            setIsConnectHovered(false);
            try { (graphActions as any)?.setHoveredEdge?.(null); } catch { }
          }}
        />
      )}

      {showAffordance && props.edgeType !== 'comment' && (
        <EdgeMidpointControl
          cx={actualLabelX}
          cy={actualLabelY}
          borderColor={visual.borderColor}
          onContextMenu={handleContextMenu}
          disabled={grabMode}
        >
          {visual.midpointContent}
        </EdgeMidpointControl>
      )}

      {!connectMode && !grabMode && props.edgeType !== 'comment' && shouldRenderOverlay && (
        <EdgeOverlay
          cx={actualLabelX}
          cy={actualLabelY}
          isHovered={isHovered}
          selected={selected}
          edgeId={props.id as string}
          edgeType={props.edgeType}
          marketPrice={(marketEnabled && (props.edgeType === 'support' || props.edgeType === 'negation' || props.edgeType === 'objection')) ? marketPrice : NaN}
          marketMine={(marketEnabled && (props.edgeType === 'support' || props.edgeType === 'negation' || props.edgeType === 'objection')) ? Number(((props as any).data?.market?.mine) ?? NaN) : NaN}
          marketTotal={(marketEnabled && (props.edgeType === 'support' || props.edgeType === 'negation' || props.edgeType === 'objection')) ? Number(((props as any).data?.market?.total) ?? NaN) : NaN}
          marketInfluence={(marketEnabled && (props.edgeType === 'support' || props.edgeType === 'negation' || props.edgeType === 'objection')) ? infl : NaN}
          votes={((props as any).data?.votes) || []}
          srcX={sourceX ?? 0}
          srcY={sourceY ?? 0}
          tgtX={targetX ?? 0}
          tgtY={targetY ?? 0}
          onMouseEnter={() => setHoveredEdge(props.id as string)}
          onMouseLeave={() => setHoveredEdge(null)}

          onAddObjection={handleAddObjection}
          onToggleEdgeType={() => updateEdgeType?.(props.id as string, props.edgeType === "support" ? "negation" : "support")}
          onConnectionClick={(sx: number, sy: number) => {
            setClickPos({ x: sx, y: sy });
            setQuickBuyOpen(true);
            setSelectedEdge?.(props.id as string);
          }}
          starColor={visual.starColor}
          sourceLabel={(sourceNode as any)?.data?.content || (sourceNode as any)?.data?.statement}
          targetLabel={(targetNode as any)?.data?.content || (targetNode as any)?.data?.statement}
          suppress={endpointDragging}
          suppressReason={suppressReason}
        />
      )}

      {/* Edge-level quick buy and side panel removed; edge buy handled inline via EdgeOverlay */}

      <ContextMenu
        open={menuOpen}
        x={menuPos.x}
        y={menuPos.y}
        onClose={() => setMenuOpen(false)}
        items={[
          {
            label: 'Delete Edge',
            onClick: () => deleteNode?.(props.id as string),
            danger: true,
          },
        ]}
      />
    </>
  );
};

export const BaseEdge = React.memo(BaseEdgeImpl, (a, b) => {
  return (
    a.id === b.id &&
    a.source === b.source &&
    a.target === b.target &&
    (a as any).sourceX === (b as any).sourceX &&
    (a as any).sourceY === (b as any).sourceY &&
    (a as any).targetX === (b as any).targetX &&
    (a as any).targetY === (b as any).targetY &&
    a.edgeType === b.edgeType &&
    JSON.stringify(a.data) === JSON.stringify(b.data)
  );
});
