import React, { useMemo } from 'react';
import { EdgeProps, getBezierPath, getStraightPath, Position, useStore } from '@xyflow/react';
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
import { computeMidpointBetweenBorders } from '@/utils/experiment/multiplayer/edgePathUtils';
import { useMindchangeRenderConfig } from './useMindchangeRenderConfig';
import { EdgeSelectionHighlight } from './EdgeSelectionHighlight';
import { MainEdgeRenderer } from './MainEdgeRenderer';
import { MindchangeBadges } from './MindchangeBadges';

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

  const maskingData = useEdgeNodeMasking(sourceNode, targetNode);

  const { perfMode } = usePerformanceMode();
  const lightMode = (perfMode || grabMode) && !selected && !isHovered && !connectMode;

  const [vx, vy, zoom] = useStore((s: any) => s.transform);

  const strapGeometry = useStrapGeometry(
    (visual.useStrap && !lightMode) ? {
      sourceX: sourceX ?? 0,
      sourceY: sourceY ?? 0,
      targetX: targetX ?? 0,
      targetY: targetY ?? 0,
      relevance,
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

  const [midXBetweenBorders, midYBetweenBorders] = useMemo(() => {
    return computeMidpointBetweenBorders(sourceNode, targetNode, labelX, labelY);
  }, [sourceNode, targetNode, labelX, labelY]);

  const edgeStyles = useMemo(() => {
    const enableMindchange = typeof process !== 'undefined' && ["true", "1", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE || '').toLowerCase());
    const fixedWidth = enableMindchange ? 2 : visual.strokeWidth(relevance);
    const baseStyle = {
      stroke: visual.stroke,
      strokeWidth: fixedWidth,
    };

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
  }, [visual, relevance, props.edgeType, targetNode]);

  const edgeStylesWithPointer = useMemo(() => {
    return grabMode ? { ...edgeStyles, pointerEvents: 'none' as any } : edgeStyles;
  }, [edgeStyles, grabMode]);

  const mindchange = (props as any).data?.mindchange;
  const mindchangeRenderConfig = useMindchangeRenderConfig(mindchange, props.edgeType);

  const mindchangeActive = !!((props as any).data?.mindchange && (
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

          <MainEdgeRenderer
            mindchangeRenderMode={mindchangeRenderConfig.mode}
            mindchangeMarkerId={mindchangeRenderConfig.markerId}
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
