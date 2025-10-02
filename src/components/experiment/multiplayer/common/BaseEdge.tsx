import React, { useMemo } from 'react';
import { EdgeProps, StraightEdge, BezierEdge, getBezierPath, getStraightPath, Position } from '@xyflow/react';
import { ContextMenu } from './ContextMenu';
import { EdgeOverlay } from './EdgeOverlay';
import { EdgeMidpointControl } from './EdgeMidpointControl';
import { EdgeInteractionOverlay } from './EdgeInteractionOverlay';
import { EdgeMaskDefs } from './EdgeMaskDefs';
import { useEdgeState } from './useEdgeState';
import { useEdgeAnchorPosition } from './useEdgeAnchorPosition';
import { useEdgeNodeMasking } from './useEdgeNodeMasking';
import { useStrapGeometry } from './EdgeStrapGeometry';
import { EDGE_CONFIGURATIONS, EdgeType } from './EdgeConfiguration';
import { edgeIsObjectionStyle } from './edgeStyle';

export interface BaseEdgeProps extends EdgeProps {
  edgeType: EdgeType;
}

export const BaseEdge: React.FC<BaseEdgeProps> = (props) => {
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
    beginConnectFromEdge,
    completeConnectToEdge,
  } = graphActions;

  const handleUpdateRelevance = (newRelevance: number) => {
    updateEdgeRelevance?.(props.id as string, newRelevance);
  };

  // Use anchor position hook
  useEdgeAnchorPosition({
    id: props.id as string,
    x: cx,
    y: cy,
    updateEdgeAnchorPosition: graphActions.updateEdgeAnchorPosition,
  });

  // Node masking data
  const maskingData = useEdgeNodeMasking(sourceNode, targetNode);

  // Strap geometry for strap-based edges
  const strapGeometry = useStrapGeometry(
    visual.useStrap ? {
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

  // Dynamic edge styles
  const edgeStyles = useMemo(() => {
    const baseStyle = {
      stroke: visual.stroke,
      strokeWidth: visual.strokeWidth(relevance),
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
      const midpoint = { x: cx, y: cy };
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
      <g style={{ opacity: edgeOpacity }}>
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
        <g mask={`url(#edge-mask-${props.id})`}>
          {/* Strap background for strap-based edges */}
          {visual.useStrap && strapGeometry && (
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

          {/* Main edge */}
          {visual.useBezier ? (
            <BezierEdge
              {...props}
              {...(props.edgeType === 'objection' && {
                sourcePosition: sourceNode?.position?.y < targetNode?.position?.y ? Position.Bottom : Position.Top,
                targetPosition: sourceNode?.position?.y > targetNode?.position?.y ? Position.Bottom : Position.Top,
              })}
              style={edgeStyles}
              pathOptions={{ curvature: visual.curvature }}
            />
          ) : (
            <StraightEdge
              {...props}
              style={edgeStyles}
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

      {/* Interaction overlay */}
      <EdgeInteractionOverlay
        shouldRender={shouldRenderOverlay}
        pathD={visual.useBezier ? pathD : undefined}
        sourceX={visual.useBezier ? undefined : sourceX}
        sourceY={visual.useBezier ? undefined : sourceY}
        targetX={visual.useBezier ? undefined : targetX}
        targetY={visual.useBezier ? undefined : targetY}
        onEdgeClick={handleEdgeClick}
        onContextMenu={handleContextMenu}
      />

      {/* Midpoint control */}
      {showAffordance && (
        <EdgeMidpointControl
          cx={cx}
          cy={cy}
          borderColor={visual.borderColor}
          onContextMenu={handleContextMenu}
        >
          {visual.midpointContent}
        </EdgeMidpointControl>
      )}

      {/* Hover overlay */}
      <EdgeOverlay
        cx={cx}
        cy={cy}
        isHovered={isHovered}
        relevance={relevance}
        edgeId={props.id as string}
        edgeType={props.edgeType}
        onMouseEnter={() => setHoveredEdge(props.id as string)}
        onMouseLeave={() => setHoveredEdge(null)}
        onUpdateRelevance={handleUpdateRelevance}
        onAddObjection={handleAddObjection}
        onToggleEdgeType={connectMode ? undefined : () => updateEdgeType?.(props.id as string, props.edgeType === "support" ? "negation" : "support")}
        starColor={visual.starColor}
      />

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
