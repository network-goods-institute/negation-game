import React, { useMemo } from 'react';
import { EdgeProps, getBezierPath, getStraightPath, Position, useStore, Edge } from '@xyflow/react';
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
import { computeMidpointBetweenBorders, getTrimmedLineCoords } from '@/utils/experiment/multiplayer/edgePathUtils';
import { useMindchangeRenderConfig } from './useMindchangeRenderConfig';
import { EdgeSelectionHighlight } from './EdgeSelectionHighlight';
import { MainEdgeRenderer } from './MainEdgeRenderer';
import { MindchangeBadges } from './MindchangeBadges';
import { computeMindchangeStrokeWidth } from './computeMindchangeStrokeWidth';

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
  } = graphActions;

  

  const maskingData = useEdgeNodeMasking(sourceNode, targetNode);

  const { perfMode } = usePerformanceMode();
  const lightMode = (perfMode || grabMode) && !selected && !isHovered && !connectMode;

  const [vx, vy, zoom] = useStore((s: any) => s.transform);
  const edges = useStore((s: any) => Array.from(s.edges?.values?.() || s.edges || []));

  const mindchange = (props as any).data?.mindchange;
  const mcF = Math.max(0, Math.min(100, Math.round(Number(mindchange?.forward?.average ?? 0)))) / 100;
  const mcB = Math.max(0, Math.min(100, Math.round(Number(mindchange?.backward?.average ?? 0)))) / 100;
  const strapStrength = Math.max(mcF, mcB);
  const strapGeometry = useStrapGeometry(
    (visual.useStrap && !lightMode) ? {
      sourceX: sourceX ?? 0,
      sourceY: sourceY ?? 0,
      targetX: targetX ?? 0,
      targetY: targetY ?? 0,
      strength: strapStrength,
    } : null
  );

  const [pathD, labelX, labelY] = useMemo(() => {
    if (visual.useBezier) {
      const curvature = (behavior.simplifyDuringDrag && isHighFrequencyUpdates) ? 0 : (visual.curvature ?? 0.35);

      let sourcePosition = (props as any).sourcePosition;
      let targetPosition = (props as any).targetPosition;

      if (props.edgeType === 'objection') {
        const objectionY = sourceNode?.position?.y ?? 0;
        const anchorY = targetNode?.position?.y ?? 0;
        sourcePosition = objectionY < anchorY ? Position.Top : Position.Bottom;
        targetPosition = objectionY > anchorY ? Position.Top : Position.Bottom;
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

  const [midXBetweenBorders, midYBetweenBorders] = useMemo(() => {
    return computeMidpointBetweenBorders(sourceNode, targetNode, labelX, labelY);
  }, [sourceNode, targetNode, labelX, labelY]);

  const mindchangeRenderConfig = useMindchangeRenderConfig(mindchange, props.edgeType);

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

  const edgeStyles = useMemo(() => {
    const width = computeMindchangeStrokeWidth({ visual, mindchange: mindchange, edgeType: props.edgeType });
    const baseStyle = {
      stroke: visual.stroke,
      strokeWidth: width,
    } as const;

    if (visual.strokeDasharray) {
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
  }, [visual, props.edgeType, targetNode, mindchange]);

  const edgeStylesWithPointer = useMemo(() => {
    return grabMode ? { ...edgeStyles, pointerEvents: 'none' as any } : edgeStyles;
  }, [edgeStyles, grabMode]);

  const mindchangeActive = !!(mindchange && (
    (props as any).data?.mindchange?.forward?.count > 0 ||
    (props as any).data?.mindchange?.backward?.count > 0
  ));

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEdge?.(props.id as string);
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  const handleEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mindchangeMode = (graphActions as any)?.mindchangeMode;
    const mindchangeEdgeId = (graphActions as any)?.mindchangeEdgeId;

    // Handle mindchange mode: clicking base edge for objection mindchange
    if (mindchangeMode && mindchangeEdgeId) {
      const selectedEdge = edges.find((edge: any) => edge.id === mindchangeEdgeId) as Edge | undefined;
      if (selectedEdge?.type === 'objection') {
        // User clicked a base edge while setting mindchange for an objection
        const anchorIdForBase = String((selectedEdge as any).target || '');
        const baseEdgeId = anchorIdForBase.startsWith('anchor:')
          ? anchorIdForBase.slice('anchor:'.length)
          : '';

        if (baseEdgeId === props.id) {
          // This is the base edge that the objection anchors to - select backward direction
          try { console.log('[Mindchange:Select] base edge pick', { mindchangeEdgeId, baseEdgeId: props.id, dir: 'backward' }); } catch {}
          (graphActions as any)?.setSelectedEdge?.(mindchangeEdgeId);
          (graphActions as any)?.setMindchangeNextDir?.('backward');
          (graphActions as any)?.cancelConnect?.();
          return;
        }
      }
    }

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

  const contextMenuItems = [
    { label: 'Delete edge', danger: true, onClick: () => deleteNode?.(props.id as string) },
  ];

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
            mindchangeRenderMode={mindchangeRenderConfig.mode}
            mindchangeMarkerStart={mindchangeRenderConfig.markerStart}
            mindchangeMarkerEnd={mindchangeRenderConfig.markerEnd}
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
          />

          {shouldRenderOverlay && connectMode && isHovered && !selected && (
            visual.useBezier ? (
              <path d={pathD} stroke="hsl(var(--sync-primary))" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.8} strokeDasharray="8 4" />
            ) : (
              <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="hsl(var(--sync-primary))" strokeWidth={6} strokeLinecap="round" opacity={0.8} strokeDasharray="8 4" />
            )
          )}

          {(() => {
            try {
              const mindchangeMode = (graphActions as any)?.mindchangeMode;
              const mindchangeEdgeId = (graphActions as any)?.mindchangeEdgeId as string | null;
              const mindchangeNextDir = (graphActions as any)?.mindchangeNextDir as ('forward'|'backward'|null);
              if (!mindchangeMode || !mindchangeEdgeId || mindchangeNextDir) return null;
              const selectedEdge = edges.find((e: any) => e.id === mindchangeEdgeId) as Edge | undefined;
              if (!selectedEdge || (selectedEdge as any).type !== 'objection') return null;
              const anchorIdForBase = String((selectedEdge as any).target || '');
              const baseEdgeId = anchorIdForBase.startsWith('anchor:') ? anchorIdForBase.slice('anchor:'.length) : '';
              if (baseEdgeId !== (props.id as string)) return null;
              return visual.useBezier ? (
                <path d={pathD} stroke="#10b981" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.95} strokeDasharray="8 4" />
              ) : (
                <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="#10b981" strokeWidth={6} strokeLinecap="round" opacity={0.95} strokeDasharray="8 4" />
              );
            } catch {
              return null;
            }
          })()}

          <MainEdgeRenderer
            mindchangeRenderMode={mindchangeRenderConfig.mode}
            mindchangeMarkerId={mindchangeRenderConfig.markerId}
            mindchangeMarkerStart={mindchangeRenderConfig.markerStart}
            mindchangeMarkerEnd={mindchangeRenderConfig.markerEnd}
            hasForward={(props as any).data?.mindchange?.forward?.count > 0}
            hasBackward={(props as any).data?.mindchange?.backward?.count > 0}
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
          />
        </g>
      </g>

      <MindchangeBadges
        edgeId={props.id as string}
        edgeType={props.edgeType}
        sourceX={sourceX ?? 0}
        sourceY={sourceY ?? 0}
        targetX={targetX ?? 0}
        targetY={targetY ?? 0}
        sourceNode={sourceNode}
        targetNode={targetNode}
        mindchangeData={mindchange}
        overlayActive={mindchangeActive && (graphActions as any)?.overlayActiveEdgeId === (props.id as string)}
        zoom={zoom}
        vx={vx}
        vy={vy}
      />

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

      {showAffordance && props.edgeType !== 'comment' && (
        <EdgeMidpointControl
          cx={(bidirectionalLabelX ?? midXBetweenBorders ?? labelX ?? cx) as number}
          cy={(bidirectionalLabelY ?? midYBetweenBorders ?? labelY ?? cy) as number}
          borderColor={visual.borderColor}
          onContextMenu={handleContextMenu}
          disabled={grabMode}
        >
          {visual.midpointContent}
        </EdgeMidpointControl>
      )}

      {!connectMode && !grabMode && props.edgeType !== 'comment' && (
        <EdgeOverlay
          cx={(bidirectionalLabelX ?? midXBetweenBorders ?? labelX ?? cx) as number}
          cy={(bidirectionalLabelY ?? midYBetweenBorders ?? labelY ?? cy) as number}
          isHovered={isHovered}
          selected={selected}
          edgeId={props.id as string}
          edgeType={props.edgeType}
          srcX={sourceX ?? 0}
          srcY={sourceY ?? 0}
          tgtX={targetX ?? 0}
          tgtY={targetY ?? 0}
          onMouseEnter={() => setHoveredEdge(props.id as string)}
          onMouseLeave={() => setHoveredEdge(null)}

          onAddObjection={handleAddObjection}
          onToggleEdgeType={() => updateEdgeType?.(props.id as string, props.edgeType === "support" ? "negation" : "support")}
          onConnectionClick={undefined}
          starColor={visual.starColor}
          sourceLabel={(sourceNode as any)?.data?.content || (sourceNode as any)?.data?.statement}
          targetLabel={(targetNode as any)?.data?.content || (targetNode as any)?.data?.statement}
          mindchange={mindchange}
        />
      )}

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
