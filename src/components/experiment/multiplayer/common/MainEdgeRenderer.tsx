import React from 'react';
import { BezierEdge, StraightEdge, getBezierPath, Position } from '@xyflow/react';
import { getTrimmedLineCoords } from '@/utils/experiment/multiplayer/edgePathUtils';

interface MainEdgeRendererProps {
  mindchangeRenderMode: 'normal' | 'bidirectional';
  mindchangeMarkerId?: string;
  mindchangeMarkerStart?: string;
  mindchangeMarkerEnd?: string;
  useBezier: boolean;
  curvature?: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceNode: any;
  targetNode: any;
  edgeType: string;
  edgeStylesWithPointer: any;
  props: any;
  interactionWidth?: number;
  label?: string;
  labelStyle?: any;
}

export const MainEdgeRenderer: React.FC<MainEdgeRendererProps> = ({
  mindchangeRenderMode,
  mindchangeMarkerId,
  mindchangeMarkerStart,
  mindchangeMarkerEnd,
  useBezier,
  curvature,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNode,
  targetNode,
  edgeType,
  edgeStylesWithPointer,
  props,
  interactionWidth,
  label,
  labelStyle,
}) => {
  if (mindchangeRenderMode === 'bidirectional' && !useBezier) {
    const sx = sourceX ?? 0;
    const sy = sourceY ?? 0;
    const tx = targetX ?? 0;
    const ty = targetY ?? 0;

    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const perpX = (-dy / len) * 4;
    const perpY = (dx / len) * 4;

    const forwardLine = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY, sourceNode, targetNode);
    const backwardLine = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY, sourceNode, targetNode);

    return (
      <>
        {/* Forward lane: source->target with arrow at target */}
        <line
          x1={forwardLine.fromX}
          y1={forwardLine.fromY}
          x2={forwardLine.toX}
          y2={forwardLine.toY}
          {...edgeStylesWithPointer}
          markerEnd={`url(#${mindchangeMarkerId})`}
        />
        {/* Backward lane: target->source (reversed) with arrow at source */}
        <line
          x1={backwardLine.toX}
          y1={backwardLine.toY}
          x2={backwardLine.fromX}
          y2={backwardLine.fromY}
          {...edgeStylesWithPointer}
          markerEnd={`url(#${mindchangeMarkerId})`}
        />
      </>
    );
  }

  if (mindchangeRenderMode === 'bidirectional' && useBezier) {
    const sx = sourceX ?? 0;
    const sy = sourceY ?? 0;
    const tx = targetX ?? 0;
    const ty = targetY ?? 0;

    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const perpX = (-dy / len) * 4;
    const perpY = (dx / len) * 4;

    // Get trimmed coordinates for both parallel lanes
    const f = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY, sourceNode, targetNode);
    const b = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY, sourceNode, targetNode);

    let sourcePosition = (props as any).sourcePosition;
    let targetPosition = (props as any).targetPosition;
    if (edgeType === 'objection') {
      const objectionY = sourceNode?.position?.y ?? 0;
      const anchorY = targetNode?.position?.y ?? 0;
      sourcePosition = objectionY < anchorY ? Position.Bottom : Position.Top;
      targetPosition = objectionY > anchorY ? Position.Bottom : Position.Top;
    }

    // Forward lane: complete curve from source to target
    const [fPath] = getBezierPath({
      sourceX: f.fromX,
      sourceY: f.fromY,
      sourcePosition,
      targetX: f.toX,
      targetY: f.toY,
      targetPosition,
      curvature: curvature,
    });

    // Backward lane: complete curve from target to source (reversed)
    const [bPath] = getBezierPath({
      sourceX: b.toX,
      sourceY: b.toY,
      sourcePosition: targetPosition,
      targetX: b.fromX,
      targetY: b.fromY,
      targetPosition: sourcePosition,
      curvature: curvature,
    });

    return (
      <>
        {/* Forward lane: source->target with arrow at target */}
        <path d={fPath} {...edgeStylesWithPointer} fill="none" markerEnd={`url(#${mindchangeMarkerId})`} />
        {/* Backward lane: target->source (reversed) with arrow at source */}
        <path d={bPath} {...edgeStylesWithPointer} fill="none" markerEnd={`url(#${mindchangeMarkerId})`} />
      </>
    );
  }

  if (mindchangeRenderMode === 'normal' && (mindchangeMarkerStart || mindchangeMarkerEnd) && !useBezier) {
    const sx = sourceX ?? 0;
    const sy = sourceY ?? 0;
    const tx = targetX ?? 0;
    const ty = targetY ?? 0;
    const trimmed = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0, sourceNode, targetNode);

    if (mindchangeMarkerEnd && !mindchangeMarkerStart) {
      return (
        <line
          x1={trimmed.fromX}
          y1={trimmed.fromY}
          x2={trimmed.toX}
          y2={trimmed.toY}
          {...edgeStylesWithPointer}
          markerEnd={mindchangeMarkerEnd}
        />
      );
    }

    if (mindchangeMarkerStart && !mindchangeMarkerEnd) {
      return (
        <line
          x1={trimmed.toX}
          y1={trimmed.toY}
          x2={trimmed.fromX}
          y2={trimmed.fromY}
          {...edgeStylesWithPointer}
          markerEnd={mindchangeMarkerStart}
        />
      );
    }

    return null;
  }

  if (mindchangeRenderMode === 'normal' && (mindchangeMarkerStart || mindchangeMarkerEnd) && useBezier) {
    const sx = sourceX ?? 0;
    const sy = sourceY ?? 0;
    const tx = targetX ?? 0;
    const ty = targetY ?? 0;
    const t = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0, sourceNode, targetNode);

    let sourcePosition = (props as any).sourcePosition;
    let targetPosition = (props as any).targetPosition;
    if (edgeType === 'objection') {
      const objectionY = sourceNode?.position?.y ?? 0;
      const anchorY = targetNode?.position?.y ?? 0;
      sourcePosition = objectionY < anchorY ? Position.Bottom : Position.Top;
      targetPosition = objectionY > anchorY ? Position.Bottom : Position.Top;
    }

    if (mindchangeMarkerEnd && !mindchangeMarkerStart) {
      const [mcPath] = getBezierPath({
        sourceX: t.fromX,
        sourceY: t.fromY,
        sourcePosition,
        targetX: t.toX,
        targetY: t.toY,
        targetPosition,
        curvature: curvature,
      });
      return (
        <path d={mcPath} {...edgeStylesWithPointer} fill="none" markerEnd={mindchangeMarkerEnd} />
      );
    }

    if (mindchangeMarkerStart && !mindchangeMarkerEnd) {
      const [mcPath] = getBezierPath({
        sourceX: t.toX,
        sourceY: t.toY,
        sourcePosition,
        targetX: t.fromX,
        targetY: t.fromY,
        targetPosition,
        curvature: curvature,
      });
      return (
        <path d={mcPath} {...edgeStylesWithPointer} fill="none" markerEnd={mindchangeMarkerStart} />
      );
    }

    return null;
  }

  if (useBezier) {
    return (
      <BezierEdge
        {...props}
        {...(edgeType === 'objection' && {
          sourcePosition: sourceNode?.position?.y < targetNode?.position?.y ? Position.Bottom : Position.Top,
          targetPosition: sourceNode?.position?.y > targetNode?.position?.y ? Position.Bottom : Position.Top,
        })}
        style={edgeStylesWithPointer}
        pathOptions={{ curvature: curvature }}
        markerStart={mindchangeMarkerStart}
        markerEnd={mindchangeMarkerEnd}
      />
    );
  }

  return (
    <StraightEdge
      {...props}
      style={edgeStylesWithPointer}
      interactionWidth={interactionWidth}
      {...(label && {
        label: label,
        labelShowBg: false,
        labelStyle: labelStyle,
      })}
      markerStart={mindchangeMarkerStart}
      markerEnd={mindchangeMarkerEnd}
    />
  );
};
