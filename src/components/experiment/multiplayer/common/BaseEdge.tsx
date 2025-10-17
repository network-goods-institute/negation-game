import React, { useMemo } from 'react';
import { EdgeProps, StraightEdge, BezierEdge, getBezierPath, getStraightPath, Position } from '@xyflow/react';
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
    const enableMindchange = typeof process !== 'undefined' && ["true","1","yes","on"].includes(String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE || '').toLowerCase());
    const fixedWidth = (props.edgeType !== 'objection' && enableMindchange) ? 2 : visual.strokeWidth(relevance);
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
          {/* Strap background for strap-based edges */}
          {(visual.useStrap && strapGeometry) && (
            <>
              <path d={strapGeometry.path} fill={`url(#${visual.gradientId})`} />
              <path d={strapGeometry.path} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
            </>
          )}

          {/* Selection highlight */}
          {shouldRenderOverlay && selected && (
            visual.useBezier ? (
              <path d={pathD} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
            ) : (
              <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
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
          {visual.useBezier ? (
            <BezierEdge
              {...props}
              {...(props.edgeType === 'objection' && {
                sourcePosition: sourceNode?.position?.y < targetNode?.position?.y ? Position.Bottom : Position.Top,
                targetPosition: sourceNode?.position?.y > targetNode?.position?.y ? Position.Bottom : Position.Top,
              })}
              style={edgeStylesWithPointer}
              pathOptions={{ curvature: visual.curvature }}
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
            />
          )}
        </g>
      </g>

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
