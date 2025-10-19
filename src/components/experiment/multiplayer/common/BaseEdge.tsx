import React, { useMemo } from 'react';
import { EdgeProps, StraightEdge, BezierEdge, getBezierPath, getStraightPath, Position, useStore } from '@xyflow/react';
import { createPortal } from 'react-dom';
import { ContextMenu } from './ContextMenu';
import { EdgeOverlay } from './EdgeOverlay';
import { EdgeMidpointControl } from './EdgeMidpointControl';
import { EdgeInteractionOverlay } from './EdgeInteractionOverlay';
import { EdgeMaskDefs } from './EdgeMaskDefs';
import { useEdgeState } from './useEdgeState';
import { useEdgeNodeMasking } from './useEdgeNodeMasking';
import { useStrapGeometry } from './EdgeStrapGeometry';
import { EDGE_CONFIGURATIONS, EdgeType } from './EdgeConfiguration';
import { edgeIsObjectionStyle } from './edgeStyle';
import { usePerformanceMode } from '../PerformanceContext';
import { getMarkerIdForEdgeType } from './EdgeArrowMarkers';

export interface BaseEdgeProps extends EdgeProps {
  edgeType: EdgeType;
}

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
    isHovered,
    selected,
    setIsConnectHovered,
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
  } = edgeState;

  const {
    setSelectedEdge,
    addObjectionForEdge,
    setHoveredEdge,
    updateEdgeRelevance,
    updateEdgeType,
    deleteNode,
    connectMode,
    grabMode,
    beginConnectFromEdge,
    completeConnectToEdge,
  } = graphActions;

  const handleUpdateRelevance = (newRelevance: number) => {
    updateEdgeRelevance?.(props.id as string, newRelevance);
  };

  // placeholder, will set after label coordinates are computed

  // Node masking data
  const maskingData = useEdgeNodeMasking(sourceNode, targetNode);

  const { perfMode } = usePerformanceMode();
  const lightMode = (perfMode || grabMode) && !selected && !isHovered && !connectMode;

  const [vx, vy, zoom] = useStore((s: any) => s.transform);

  // Strap geometry for strap-based edges (skip in perf/light mode)
  const strapGeometry = useStrapGeometry(
    (visual.useStrap && !lightMode) ? {
      sourceX: sourceX ?? 0,
      sourceY: sourceY ?? 0,
      targetX: targetX ?? 0,
      targetY: targetY ?? 0,
      relevance,
    } : null
  );

  // Path calculation for bezier edges
  const [pathD, labelX, labelY] = useMemo(() => {
    if (visual.useBezier) {
      const curvature = (behavior.simplifyDuringDrag && isHighFrequencyUpdates) ? 0 : (visual.curvature ?? 0.35);

      let sourcePosition = (props as any).sourcePosition;
      let targetPosition = (props as any).targetPosition;

      if (props.edgeType === 'objection') {
        const objectionY = sourceNode?.position?.y ?? 0;
        const anchorY = targetNode?.position?.y ?? 0;

        // Source (objection node) handle position - matches ObjectionNode logic
        sourcePosition = objectionY < anchorY ? Position.Bottom : Position.Top;
        // Target (anchor node) handle position - matches EdgeAnchorNode logic
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

  // Compute visual midpoint between node borders rather than between centers
  const [midXBetweenBorders, midYBetweenBorders] = useMemo(() => {
    try {
      const s = sourceNode as any;
      const t = targetNode as any;
      if (!s || !t) return [labelX, labelY] as const;
      const sw = Number(s?.width); const sh = Number(s?.height);
      const tw = Number(t?.width); const th = Number(t?.height);
      if (!Number.isFinite(sw) || !Number.isFinite(sh) || !Number.isFinite(tw) || !Number.isFinite(th)) {
        return [labelX, labelY] as const;
      }
      const sx = Number(s?.position?.x ?? 0) + sw / 2;
      const sy = Number(s?.position?.y ?? 0) + sh / 2;
      const tx = Number(t?.position?.x ?? 0) + tw / 2;
      const ty = Number(t?.position?.y ?? 0) + th / 2;

      const dx = tx - sx;
      const dy = ty - sy;
      if (dx === 0 && dy === 0) return [labelX, labelY] as const;

      const intersectRect = (cx: number, cy: number, halfW: number, halfH: number, dirX: number, dirY: number) => {
        const adx = Math.abs(dirX);
        const ady = Math.abs(dirY);
        if (adx === 0 && ady === 0) return { x: cx, y: cy };
        const txScale = adx > 0 ? (halfW / adx) : Number.POSITIVE_INFINITY;
        const tyScale = ady > 0 ? (halfH / ady) : Number.POSITIVE_INFINITY;
        const tScale = Math.min(txScale, tyScale);
        return { x: cx + dirX * tScale, y: cy + dirY * tScale };
      };

      const fromS = intersectRect(sx, sy, sw / 2, sh / 2, dx, dy);
      const fromT = intersectRect(tx, ty, tw / 2, th / 2, -dx, -dy);
      return [(fromS.x + fromT.x) / 2, (fromS.y + fromT.y) / 2] as const;
    } catch {
      return [labelX, labelY] as const;
    }
  }, [sourceNode, targetNode, labelX, labelY]);

  // Anchor positions are derived and updated centrally in GraphUpdater.

  // Dynamic edge styles
  const edgeStyles = useMemo(() => {
    const enableMindchange = typeof process !== 'undefined' && ["true", "1", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE || '').toLowerCase());
    const fixedWidth = enableMindchange ? 2 : visual.strokeWidth(relevance);
    const baseStyle = {
      stroke: visual.stroke,
      strokeWidth: fixedWidth,
    };

    if (visual.strokeDasharray) {
      // For objection edges, check if should be dotted
      if (props.edgeType === 'objection') {
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
  }, [visual, relevance, props.edgeType, targetNode]);

  const edgeStylesWithPointer = useMemo(() => {
    return grabMode ? { ...edgeStyles, pointerEvents: 'none' as any } : edgeStyles;
  }, [edgeStyles, grabMode]);

  // Helper to compute trimmed line coordinates that avoid nodes
  const getTrimmedLineCoords = (sx: number, sy: number, tx: number, ty: number, offsetX = 0, offsetY = 0) => {
    const sNode = sourceNode as any;
    const tNode = targetNode as any;

    let fromX = sx + offsetX;
    let fromY = sy + offsetY;
    let toX = tx + offsetX;
    let toY = ty + offsetY;

    // Get node dimensions
    const sWidth = Number(sNode?.width ?? sNode?.measured?.width ?? 0) || 0;
    const sHeight = Number(sNode?.height ?? sNode?.measured?.height ?? 0) || 0;
    const tWidth = Number(tNode?.width ?? tNode?.measured?.width ?? 0) || 0;
    const tHeight = Number(tNode?.height ?? tNode?.measured?.height ?? 0) || 0;

    if (sWidth > 0 && sHeight > 0 && tWidth > 0 && tHeight > 0) {
      const sCX = Number(sNode?.position?.x ?? 0) + sWidth / 2 + offsetX;
      const sCY = Number(sNode?.position?.y ?? 0) + sHeight / 2 + offsetY;
      const tCX = Number(tNode?.position?.x ?? 0) + tWidth / 2 + offsetX;
      const tCY = Number(tNode?.position?.y ?? 0) + tHeight / 2 + offsetY;

      const dirVX = tCX - sCX;
      const dirVY = tCY - sCY;
      const len = Math.max(1, Math.sqrt(dirVX * dirVX + dirVY * dirVY));
      const ux = dirVX / len;
      const uy = dirVY / len;

      // Intersect with rectangles
      const intersectRect = (cx: number, cy: number, halfW: number, halfH: number, dx: number, dy: number) => {
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if (adx === 0 && ady === 0) return { x: cx, y: cy };
        const txScale = adx > 0 ? halfW / adx : Number.POSITIVE_INFINITY;
        const tyScale = ady > 0 ? halfH / ady : Number.POSITIVE_INFINITY;
        const t = Math.min(txScale, tyScale);
        return { x: cx + dx * t, y: cy + dy * t };
      };

      const start = intersectRect(sCX, sCY, sWidth / 2, sHeight / 2, ux, uy);
      const end = intersectRect(tCX, tCY, tWidth / 2, tHeight / 2, -ux, -uy);

      // Add padding
      const padStart = Math.max(1, Math.min(8, Math.min(sWidth, sHeight) * 0.02));
      const padEnd = Math.max(1, Math.min(8, Math.min(tWidth, tHeight) * 0.02));

      fromX = start.x + ux * padStart;
      fromY = start.y + uy * padStart;
      toX = end.x - ux * padEnd;
      toY = end.y - uy * padEnd;
    }

    return { fromX, fromY, toX, toY };
  };

  // Determine arrow markers and rendering mode based on mindchange data
  const mindchange = (props as any).data?.mindchange;
  const forwardCount = mindchange?.forward?.count ?? 0;
  const backwardCount = mindchange?.backward?.count ?? 0;
  const edgeTypeForMarker = props.edgeType;

  const mindchangeRenderConfig = useMemo(() => {
    if (!mindchange) {
      return { mode: 'normal', markerStart: undefined, markerEnd: undefined };
    }

    const hasForward = forwardCount > 0;
    const hasBackward = backwardCount > 0;

    if (!hasForward && !hasBackward) {
      return { mode: 'normal', markerStart: undefined, markerEnd: undefined };
    }

    const markerId = getMarkerIdForEdgeType(edgeTypeForMarker);

    if (!markerId) {
      return { mode: 'normal', markerStart: undefined, markerEnd: undefined };
    }

    if (hasForward && hasBackward) {
      return {
        mode: 'bidirectional',
        markerId,
        markerStart: undefined,
        markerEnd: undefined,
      } as const;
    }

    return {
      mode: 'normal',
      markerStart: hasBackward ? `url(#${markerId})` : undefined,
      markerEnd: hasForward ? `url(#${markerId})` : undefined,
    } as const;
  }, [mindchange, forwardCount, backwardCount, edgeTypeForMarker]);

  const mindchangeActive = !!((props as any).data?.mindchange && (
    (props as any).data?.mindchange?.forward?.count > 0 ||
    (props as any).data?.mindchange?.backward?.count > 0
  ));

  // Event handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEdge?.(props.id as string);
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
    graphActions.clearNodeSelection?.();
    setSelectedEdge?.(props.id as string);
  };

  const handleAddObjection = () => {
    graphActions.clearNodeSelection?.();
    addObjectionForEdge(props.id as string, cx, cy);
    setHoveredEdge(null);
    setSelectedEdge?.(null);
  };

  // Context menu items
  const contextMenuItems = [
    { label: 'Delete edge', danger: true, onClick: () => deleteNode?.(props.id as string) },
  ];

  const sHidden = !!(sourceNode as any)?.data?.hidden;
  const tHidden = !!(targetNode as any)?.data?.hidden;
  const showAffordance = !(sHidden || tHidden);

  return (
    <>
      {/* Edge elements with opacity */}
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
        <g mask={`url(#edge-mask-${props.id})`}>
          {/* Strap background for strap-based edges (hidden when mindchange is active) */}
          {(visual.useStrap && strapGeometry && mindchangeRenderConfig.mode === 'normal' && !mindchangeRenderConfig.markerStart && !mindchangeRenderConfig.markerEnd) && (
            <>
              <path d={strapGeometry.path} fill={`url(#${visual.gradientId})`} />
              <path d={strapGeometry.path} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
            </>
          )}

          {/* Selection highlight */}
          {shouldRenderOverlay && selected && (
            mindchangeRenderConfig.mode === 'bidirectional' && !visual.useBezier ? (
              (() => {
                const sx = sourceX ?? 0;
                const sy = sourceY ?? 0;
                const tx = targetX ?? 0;
                const ty = targetY ?? 0;
                const dx = tx - sx;
                const dy = ty - sy;
                const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const perpX = (-dy / len) * 4;
                const perpY = (dx / len) * 4;
                const f = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY);
                const b = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY);
                return (
                  <>
                    <line x1={f.fromX} y1={f.fromY} x2={f.toX} y2={f.toY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
                    <line x1={b.toX} y1={b.toY} x2={b.fromX} y2={b.fromY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
                  </>
                );
              })()
            ) : mindchangeRenderConfig.mode === 'bidirectional' && visual.useBezier ? (
              (() => {
                const sx = sourceX ?? 0;
                const sy = sourceY ?? 0;
                const tx = targetX ?? 0;
                const ty = targetY ?? 0;
                const dx = tx - sx;
                const dy = ty - sy;
                const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const perpX = (-dy / len) * 4;
                const perpY = (dx / len) * 4;
                const f = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY);
                const b = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY);
                let sourcePosition = (props as any).sourcePosition;
                let targetPosition = (props as any).targetPosition;
                if (props.edgeType === 'objection') {
                  const objectionY = sourceNode?.position?.y ?? 0;
                  const anchorY = targetNode?.position?.y ?? 0;
                  sourcePosition = objectionY < anchorY ? Position.Bottom : Position.Top;
                  targetPosition = objectionY > anchorY ? Position.Bottom : Position.Top;
                }
                const [fPath] = getBezierPath({
                  sourceX: f.fromX,
                  sourceY: f.fromY,
                  sourcePosition,
                  targetX: f.toX,
                  targetY: f.toY,
                  targetPosition,
                  curvature: visual.curvature,
                });
                const [bPath] = getBezierPath({
                  sourceX: b.toX,
                  sourceY: b.toY,
                  sourcePosition,
                  targetX: b.fromX,
                  targetY: b.fromY,
                  targetPosition,
                  curvature: visual.curvature,
                });
                return (
                  <>
                    <path d={fPath} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
                    <path d={bPath} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
                  </>
                );
              })()
            ) : mindchangeRenderConfig.mode === 'normal' && (mindchangeRenderConfig.markerStart || mindchangeRenderConfig.markerEnd) && !visual.useBezier ? (
              (() => {
                const sx = sourceX ?? 0;
                const sy = sourceY ?? 0;
                const tx = targetX ?? 0;
                const ty = targetY ?? 0;
                const t = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0);
                return (
                  <line x1={t.fromX} y1={t.fromY} x2={t.toX} y2={t.toY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
                );
              })()
            ) : mindchangeRenderConfig.mode === 'normal' && (mindchangeRenderConfig.markerStart || mindchangeRenderConfig.markerEnd) && visual.useBezier ? (
              (() => {
                const sx = sourceX ?? 0;
                const sy = sourceY ?? 0;
                const tx = targetX ?? 0;
                const ty = targetY ?? 0;
                const t = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0);
                let sourcePosition = (props as any).sourcePosition;
                let targetPosition = (props as any).targetPosition;
                if (props.edgeType === 'objection') {
                  const objectionY = sourceNode?.position?.y ?? 0;
                  const anchorY = targetNode?.position?.y ?? 0;
                  sourcePosition = objectionY < anchorY ? Position.Bottom : Position.Top;
                  targetPosition = objectionY > anchorY ? Position.Bottom : Position.Top;
                }
                const [p] = getBezierPath({
                  sourceX: t.fromX,
                  sourceY: t.fromY,
                  sourcePosition,
                  targetX: t.toX,
                  targetY: t.toY,
                  targetPosition,
                  curvature: visual.curvature,
                });
                return (
                  <path d={p} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
                );
              })()
            ) : (
              visual.useBezier ? (
                <path d={pathD} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
              ) : (
                <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
              )
            )
          )}

          {/* Connection mode hover highlight */}
          {shouldRenderOverlay && connectMode && isHovered && !selected && (
            visual.useBezier ? (
              <path d={pathD} stroke="hsl(var(--sync-primary))" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.8} strokeDasharray="8 4" />
            ) : (
              <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="hsl(var(--sync-primary))" strokeWidth={6} strokeLinecap="round" opacity={0.8} strokeDasharray="8 4" />
            )
          )}

          {/* Main edge */}
          {mindchangeRenderConfig.mode === 'bidirectional' && !visual.useBezier ? (
            // Bidirectional mindchange: render two offset parallel lines
            (() => {
              const sx = sourceX ?? 0;
              const sy = sourceY ?? 0;
              const tx = targetX ?? 0;
              const ty = targetY ?? 0;

              const dx = tx - sx;
              const dy = ty - sy;
              const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
              const perpX = (-dy / len) * 4; // Offset distance
              const perpY = (dx / len) * 4;

              // Trim both lines to avoid going under nodes
              const forwardLine = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY);
              const backwardLine = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY);

              return (
                <>
                  {/* Forward line (offset in one direction) */}
                  <line
                    x1={forwardLine.fromX}
                    y1={forwardLine.fromY}
                    x2={forwardLine.toX}
                    y2={forwardLine.toY}
                    {...edgeStylesWithPointer}
                    markerEnd={`url(#${mindchangeRenderConfig.markerId})`}
                  />
                  {/* Backward line (offset in opposite direction) */}
                  <line
                    x1={backwardLine.toX}
                    y1={backwardLine.toY}
                    x2={backwardLine.fromX}
                    y2={backwardLine.fromY}
                    {...edgeStylesWithPointer}
                    markerEnd={`url(#${mindchangeRenderConfig.markerId})`}
                  />
                </>
              );
            })()
          ) : mindchangeRenderConfig.mode === 'bidirectional' && visual.useBezier ? (
            // Bidirectional mindchange on bezier: render two offset trimmed curves
            (() => {
              const sx = sourceX ?? 0;
              const sy = sourceY ?? 0;
              const tx = targetX ?? 0;
              const ty = targetY ?? 0;

              const dx = tx - sx;
              const dy = ty - sy;
              const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
              const perpX = (-dy / len) * 4;
              const perpY = (dx / len) * 4;

              const f = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY);
              const b = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY);

              let sourcePosition = (props as any).sourcePosition;
              let targetPosition = (props as any).targetPosition;
              if (props.edgeType === 'objection') {
                const objectionY = sourceNode?.position?.y ?? 0;
                const anchorY = targetNode?.position?.y ?? 0;
                sourcePosition = objectionY < anchorY ? Position.Bottom : Position.Top;
                targetPosition = objectionY > anchorY ? Position.Bottom : Position.Top;
              }

              const [fPath] = getBezierPath({
                sourceX: f.fromX,
                sourceY: f.fromY,
                sourcePosition,
                targetX: f.toX,
                targetY: f.toY,
                targetPosition,
                curvature: visual.curvature,
              });

              // Reverse the backward curve so we always use markerEnd
              const [bPath] = getBezierPath({
                sourceX: b.toX,
                sourceY: b.toY,
                sourcePosition,
                targetX: b.fromX,
                targetY: b.fromY,
                targetPosition,
                curvature: visual.curvature,
              });

              return (
                <>
                  <path d={fPath} {...edgeStylesWithPointer} fill="none" markerEnd={`url(#${mindchangeRenderConfig.markerId})`} />
                  <path d={bPath} {...edgeStylesWithPointer} fill="none" markerEnd={`url(#${mindchangeRenderConfig.markerId})`} />
                </>
              );
            })()
          ) : mindchangeRenderConfig.mode === 'normal' && (mindchangeRenderConfig.markerStart || mindchangeRenderConfig.markerEnd) && !visual.useBezier ? (
            // Single-direction mindchange: render trimmed line with arrow
            (() => {
              const sx = sourceX ?? 0;
              const sy = sourceY ?? 0;
              const tx = targetX ?? 0;
              const ty = targetY ?? 0;
              const trimmed = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0);

              // Always render with markerEnd for consistent half-head orientation
              if (mindchangeRenderConfig.markerEnd && !mindchangeRenderConfig.markerStart) {
              return (
                <line
                  x1={trimmed.fromX}
                  y1={trimmed.fromY}
                  x2={trimmed.toX}
                  y2={trimmed.toY}
                  {...edgeStylesWithPointer}
                  markerEnd={mindchangeRenderConfig.markerEnd}
                />
              );
            }

              if (mindchangeRenderConfig.markerStart && !mindchangeRenderConfig.markerEnd) {
                return (
                  <line
                    x1={trimmed.toX}
                    y1={trimmed.toY}
                    x2={trimmed.fromX}
                    y2={trimmed.fromY}
                    {...edgeStylesWithPointer}
                    markerEnd={mindchangeRenderConfig.markerStart}
                  />
                );
              }

              return null;
            })()
          ) : mindchangeRenderConfig.mode === 'normal' && (mindchangeRenderConfig.markerStart || mindchangeRenderConfig.markerEnd) && visual.useBezier ? (
            // Single-direction mindchange on bezier: render trimmed curve with arrow
            (() => {
              const sx = sourceX ?? 0;
              const sy = sourceY ?? 0;
              const tx = targetX ?? 0;
              const ty = targetY ?? 0;
              const t = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0);

              let sourcePosition = (props as any).sourcePosition;
              let targetPosition = (props as any).targetPosition;
              if (props.edgeType === 'objection') {
                const objectionY = sourceNode?.position?.y ?? 0;
                const anchorY = targetNode?.position?.y ?? 0;
                sourcePosition = objectionY < anchorY ? Position.Bottom : Position.Top;
                targetPosition = objectionY > anchorY ? Position.Bottom : Position.Top;
              }

              // Always render with markerEnd for consistent half-head orientation
              if (mindchangeRenderConfig.markerEnd && !mindchangeRenderConfig.markerStart) {
                const [mcPath] = getBezierPath({
                  sourceX: t.fromX,
                  sourceY: t.fromY,
                  sourcePosition,
                  targetX: t.toX,
                  targetY: t.toY,
                  targetPosition,
                  curvature: visual.curvature,
                });
                return (
                  <path d={mcPath} {...edgeStylesWithPointer} fill="none" markerEnd={mindchangeRenderConfig.markerEnd} />
                );
              }

              if (mindchangeRenderConfig.markerStart && !mindchangeRenderConfig.markerEnd) {
                const [mcPath] = getBezierPath({
                  sourceX: t.toX,
                  sourceY: t.toY,
                  sourcePosition,
                  targetX: t.fromX,
                  targetY: t.fromY,
                  targetPosition,
                  curvature: visual.curvature,
                });
                return (
                  <path d={mcPath} {...edgeStylesWithPointer} fill="none" markerEnd={mindchangeRenderConfig.markerStart} />
                );
              }

              return null;
            })()
          ) : visual.useBezier ? (
            <BezierEdge
              {...props}
              {...(props.edgeType === 'objection' && {
                sourcePosition: sourceNode?.position?.y < targetNode?.position?.y ? Position.Bottom : Position.Top,
                targetPosition: sourceNode?.position?.y > targetNode?.position?.y ? Position.Bottom : Position.Top,
              })}
              style={edgeStylesWithPointer}
              pathOptions={{ curvature: visual.curvature }}
              markerStart={mindchangeRenderConfig.markerStart}
              markerEnd={mindchangeRenderConfig.markerEnd}
            />
          ) : (
            <StraightEdge
              {...props}
              style={edgeStylesWithPointer}
              interactionWidth={behavior.interactionWidth}
              {...(visual.label && {
                label: visual.label,
                labelShowBg: false,
                labelStyle: visual.labelStyle,
              })}
              markerStart={mindchangeRenderConfig.markerStart}
              markerEnd={mindchangeRenderConfig.markerEnd}
            />
          )}
        </g>
      </g>

      {/* Mindchange badges at arrow tips (not indicator edges) */}
      {(() => {
        if (!mindchangeActive) return null;
        if (props.edgeType !== 'negation' && props.edgeType !== 'objection') return null;
        const overlayActive = (graphActions as any)?.overlayActiveEdgeId === (props.id as string);
        if (!overlayActive) return null;
        const mindchangeData = (props as any).data?.mindchange;
        const hasForward = mindchangeData?.forward?.count > 0;
        const hasBackward = mindchangeData?.backward?.count > 0;
        if (!hasForward && !hasBackward) return null;

        const sx = sourceX ?? 0;
        const sy = sourceY ?? 0;
        const tx = targetX ?? 0;
        const ty = targetY ?? 0;

        const dx = tx - sx;
        const dy = ty - sy;
        const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const offset = hasForward && hasBackward ? 4 : 0;
        const perpX = (-dy / len) * offset;
        const perpY = (dx / len) * offset;

        // Forward arrow tip
        const fTrim = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY);
        // Backward arrow tip (reversed orientation)
        const bTrim = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY);

        const fAvgCanon = Number(mindchangeData?.forward?.average || 0);
        const bAvgCanon = Number(mindchangeData?.backward?.average || 0);
        const fVal = Math.round(fAvgCanon);
        const bVal = Math.round(bAvgCanon);

        const badge = (x: number, y: number, value: number, key: string) => {
          const left = (vx || 0) + x * (zoom || 1);
          const top = (vy || 0) + y * (zoom || 1);
          const isNeg = value < 0;
          const cls = isNeg
            ? 'px-2.5 py-1 text-[12px] leading-none font-semibold rounded bg-rose-50/95 border-2 border-rose-300 text-rose-700 select-none shadow-md'
            : 'px-2.5 py-1 text-[12px] leading-none font-semibold rounded bg-amber-50/95 border-2 border-amber-300 text-amber-700 select-none shadow-md';
          const label = value > 0 ? `+${value}%` : `${value}%`;
          const portalTarget = typeof document !== 'undefined' ? document.body : null;
          if (!portalTarget) return null;
          return createPortal(
            <div key={key} style={{ position: 'fixed', left, top, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 110 }}>
              <span className={cls}>{label}</span>
            </div>,
            portalTarget
          );
        };

        return (
          <>
            {hasForward && badge(fTrim.toX, fTrim.toY, fVal, `${props.id}-mc-fwd`)}
            {hasBackward && badge(bTrim.fromX, bTrim.fromY, bVal, `${props.id}-mc-bwd`)}
          </>
        );
      })()}

      {/* Interaction overlay (enabled in connect and normal modes; disabled only in hand mode) */}
      {!grabMode && (
        <EdgeInteractionOverlay
          shouldRender={shouldRenderOverlay}
          pathD={visual.useBezier ? pathD : undefined}
          sourceX={visual.useBezier ? undefined : sourceX}
          sourceY={visual.useBezier ? undefined : sourceY}
          targetX={visual.useBezier ? undefined : targetX}
          targetY={visual.useBezier ? undefined : targetY}
          onEdgeClick={handleEdgeClick}
          onContextMenu={handleContextMenu}
          onMouseEnter={() => setIsConnectHovered(true)}
          onMouseLeave={() => setIsConnectHovered(false)}
        />
      )}

      {/* Midpoint control (non-interactable in hand mode) */}
      {showAffordance && (
        <EdgeMidpointControl
          cx={(midXBetweenBorders ?? labelX ?? cx) as number}
          cy={(midYBetweenBorders ?? labelY ?? cy) as number}
          borderColor={visual.borderColor}
          onContextMenu={handleContextMenu}
          disabled={grabMode}
        >
          {visual.midpointContent}
        </EdgeMidpointControl>
      )}

      {/* Hover overlay (disabled in connect or hand mode) */}
      {!connectMode && !grabMode && (
        <EdgeOverlay
          cx={(midXBetweenBorders ?? labelX ?? cx) as number}
          cy={(midYBetweenBorders ?? labelY ?? cy) as number}
          isHovered={isHovered}
          selected={selected}
          relevance={relevance}
          edgeId={props.id as string}
          edgeType={props.edgeType}
          srcX={sourceX ?? 0}
          srcY={sourceY ?? 0}
          tgtX={targetX ?? 0}
          tgtY={targetY ?? 0}
          onMouseEnter={() => setHoveredEdge(props.id as string)}
          onMouseLeave={() => setHoveredEdge(null)}
          onUpdateRelevance={handleUpdateRelevance}
          onAddObjection={handleAddObjection}
          onToggleEdgeType={() => updateEdgeType?.(props.id as string, props.edgeType === "support" ? "negation" : "support")}
          onConnectionClick={undefined}
          starColor={visual.starColor}
          sourceLabel={(sourceNode as any)?.data?.content || (sourceNode as any)?.data?.statement}
          targetLabel={(targetNode as any)?.data?.content || (targetNode as any)?.data?.statement}
          mindchange={(props as any).data?.mindchange}

        />
      )}

      {/* Context menu */}
      <ContextMenu
        open={menuOpen}
        x={menuPos.x}
        y={menuPos.y}
        onClose={() => setMenuOpen(false)}
        items={contextMenuItems}
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
