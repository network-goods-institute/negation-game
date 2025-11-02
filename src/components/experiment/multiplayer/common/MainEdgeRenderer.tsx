import React from 'react';
import { BezierEdge, StraightEdge, getBezierPath, Position } from '@xyflow/react';
import { getTrimmedLineCoords } from '@/utils/experiment/multiplayer/edgePathUtils';

interface MainEdgeRendererProps {
  mindchangeRenderMode: 'normal' | 'bidirectional';
  mindchangeMarkerId?: string;
  mindchangeMarkerStart?: string;
  mindchangeMarkerEnd?: string;
  hasForward?: boolean;
  hasBackward?: boolean;
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
  hasForward,
  hasBackward,
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
  const isObjectionEdge = edgeType === 'objection';
  const effectiveMode = (isObjectionEdge && mindchangeRenderMode === 'bidirectional' && !(hasForward && hasBackward))
    ? 'normal'
    : mindchangeRenderMode;
  const strokeWidth = (() => {
    try { return Number((edgeStylesWithPointer as any)?.strokeWidth ?? 2); } catch { return 2; }
  })();
  const arrowSize = Math.max(8, Math.round(6 + strokeWidth * 0.9));
  const parseCubicFromPath = (d: string) => {
    try {
      // Expected: M sx,sy C c1x,c1y c2x,c2y ex,ey
      const parts = d.trim().split(/[MC]/i).map(s => s.trim()).filter(Boolean);
      if (parts.length < 2) return null;
      const mCoords = parts[0].split(/\s*,\s*|\s+/).map(Number);
      const cCoords = parts[1].split(/\s*,\s*|\s+/).map(Number);
      if (mCoords.length < 2 || cCoords.length < 6) return null;
      const p0 = { x: mCoords[0], y: mCoords[1] };
      const c1 = { x: cCoords[0], y: cCoords[1] };
      const c2 = { x: cCoords[2], y: cCoords[3] };
      const p3 = { x: cCoords[4], y: cCoords[5] };
      return { p0, c1, c2, p3 };
    } catch {
      return null;
    }
  };

  const renderArrowHead = (
    x: number,
    y: number,
    angleRad: number,
    color: string = edgeType === 'objection' ? '#f97316' : '#9CA3AF',
    size: number = arrowSize
  ) => (
    <g transform={`translate(${x} ${y}) rotate(${(angleRad * 180) / Math.PI})`} style={{ pointerEvents: 'none' }}>
      <path d={`M 0 0 L ${-size} ${size * 0.5} L ${-size} ${-size * 0.5} Z`} fill={color} stroke="white" strokeWidth={Math.max(1, strokeWidth * 0.25)} />
    </g>
  );
  if (effectiveMode === 'bidirectional' && !useBezier) {
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

    const isObjection = edgeType === 'objection';
    return (
      <>
        {/* Forward lane: source->target with arrow at source (moved to other end) */}
        <line
          x1={forwardLine.fromX}
          y1={forwardLine.fromY}
          x2={forwardLine.toX}
          y2={forwardLine.toY}
          {...edgeStylesWithPointer}
          {...(!isObjection ? { markerStart: `url(#${mindchangeMarkerId})` } : {})}
        />
        {isObjection && renderArrowHead(
          forwardLine.toX,
          forwardLine.toY,
          Math.atan2(forwardLine.toY - forwardLine.fromY, forwardLine.toX - forwardLine.fromX)
        )}
        {/* Backward lane: target->source (reversed) with arrow at target (moved to other end) */}
        <line
          x1={backwardLine.toX}
          y1={backwardLine.toY}
          x2={backwardLine.fromX}
          y2={backwardLine.fromY}
          {...edgeStylesWithPointer}
          {...(!isObjection ? { markerStart: `url(#${mindchangeMarkerId})` } : {})}
        />
        {isObjection && renderArrowHead(
          backwardLine.fromX,
          backwardLine.fromY,
          Math.atan2(backwardLine.fromY - backwardLine.toY, backwardLine.fromX - backwardLine.toX)
        )}
      </>
    );
  }

  if (effectiveMode === 'bidirectional' && useBezier) {
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
      sourcePosition = objectionY < anchorY ? Position.Top : Position.Bottom;
      targetPosition = objectionY > anchorY ? Position.Top : Position.Bottom;
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

    const isObjection = edgeType === 'objection';
    return (
      <>
        {/* Forward lane: source->target */}
        <path d={fPath} {...edgeStylesWithPointer} fill="none" />
        {(() => {
          if (!isObjection) return null;
          const parsed = parseCubicFromPath(fPath);
          if (parsed) {
            const ang = Math.atan2(parsed.p3.y - parsed.c2.y, parsed.p3.x - parsed.c2.x);
            return renderArrowHead(parsed.p3.x, parsed.p3.y, ang);
          }
          return null;
        })()}
        {/* Backward lane: target->source (reversed) */}
        <path d={bPath} {...edgeStylesWithPointer} fill="none" />
        {(() => {
          if (!isObjection) return null;
          const parsed = parseCubicFromPath(bPath);
          if (parsed) {
            const ang = Math.atan2(parsed.p0.y - parsed.c1.y, parsed.p0.x - parsed.c1.x);
            return renderArrowHead(parsed.p0.x, parsed.p0.y, ang);
          }
          return null;
        })()}
      </>
    );
  }

  if (effectiveMode === 'normal' && (mindchangeMarkerStart || mindchangeMarkerEnd) && !useBezier) {
    const sx = sourceX ?? 0;
    const sy = sourceY ?? 0;
    const tx = targetX ?? 0;
    const ty = targetY ?? 0;
    const trimmed = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0, sourceNode, targetNode);

    if (edgeType === 'objection' && (mindchangeMarkerEnd || mindchangeMarkerStart)) {
      const isForward = Boolean(mindchangeMarkerEnd) && !mindchangeMarkerStart;
      return (
        <>
          <line x1={trimmed.fromX} y1={trimmed.fromY} x2={trimmed.toX} y2={trimmed.toY} {...edgeStylesWithPointer} />
          {renderArrowHead(
            isForward ? trimmed.toX : trimmed.fromX,
            isForward ? trimmed.toY : trimmed.fromY,
            Math.atan2(
              (isForward ? trimmed.toY : trimmed.fromY) - (isForward ? trimmed.fromY : trimmed.toY),
              (isForward ? trimmed.toX : trimmed.fromX) - (isForward ? trimmed.fromX : trimmed.toX)
            )
          )}
        </>
      );
    }

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

  if (effectiveMode === 'normal' && (mindchangeMarkerStart || mindchangeMarkerEnd) && useBezier) {
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
      sourcePosition = objectionY < anchorY ? Position.Top : Position.Bottom;
      targetPosition = objectionY > anchorY ? Position.Top : Position.Bottom;
    }

    if (edgeType === 'objection' && (mindchangeMarkerEnd || mindchangeMarkerStart)) {
      const isForward = Boolean(mindchangeMarkerEnd) && !mindchangeMarkerStart;
      const [mcPath] = getBezierPath({
        sourceX: isForward ? t.fromX : t.toX,
        sourceY: isForward ? t.fromY : t.toY,
        sourcePosition,
        targetX: isForward ? t.toX : t.fromX,
        targetY: isForward ? t.toY : t.fromY,
        targetPosition,
        curvature: curvature,
      });
      const parsed = parseCubicFromPath(mcPath);
      return (
        <>
          <path d={mcPath} {...edgeStylesWithPointer} fill="none" />
          {parsed ? renderArrowHead(parsed.p3.x, parsed.p3.y, Math.atan2(parsed.p3.y - parsed.c2.y, parsed.p3.x - parsed.c2.x)) : null}
        </>
      );
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
