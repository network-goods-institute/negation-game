import React from 'react';
import { getBezierPath, Position } from '@xyflow/react';
import { getTrimmedLineCoords } from '@/utils/experiment/multiplayer/edgePathUtils';

interface EdgeSelectionHighlightProps {
  selected: boolean;
  shouldRenderOverlay: boolean;
  mindchangeRenderMode: 'normal' | 'bidirectional';
  mindchangeMarkerStart?: string;
  mindchangeMarkerEnd?: string;
  edgeId?: string;
  useBezier: boolean;
  curvature?: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceNode: any;
  targetNode: any;
  edgeType: string;
  pathD?: string;
}

export const EdgeSelectionHighlight: React.FC<EdgeSelectionHighlightProps> = ({
  selected,
  shouldRenderOverlay,
  mindchangeRenderMode,
  mindchangeMarkerStart,
  mindchangeMarkerEnd,
  edgeId,
  useBezier,
  curvature,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNode,
  targetNode,
  edgeType,
  pathD,
}) => {
  if (!shouldRenderOverlay || !selected) return null;

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
    const f = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY, sourceNode, targetNode);
    const b = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY, sourceNode, targetNode);
    return (
      <>
        <line data-edge-overlay={edgeId} x1={f.fromX} y1={f.fromY} x2={f.toX} y2={f.toY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
        <line data-edge-overlay={edgeId} x1={b.toX} y1={b.toY} x2={b.fromX} y2={b.fromY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
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

    const f = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY, sourceNode, targetNode);
    const b = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY, sourceNode, targetNode);

    let sourcePosition = Position.Right;
    let targetPosition = Position.Left;
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

    // Backward lane: complete curve from target to source
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
        <path data-edge-overlay={edgeId} d={fPath} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
        <path data-edge-overlay={edgeId} d={bPath} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
      </>
    );
  }

  if (mindchangeRenderMode === 'normal' && (mindchangeMarkerStart || mindchangeMarkerEnd) && !useBezier) {
    const sx = sourceX ?? 0;
    const sy = sourceY ?? 0;
    const tx = targetX ?? 0;
    const ty = targetY ?? 0;
    const t = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0, sourceNode, targetNode);
    return (
      <line data-edge-overlay={edgeId} x1={t.fromX} y1={t.fromY} x2={t.toX} y2={t.toY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
    );
  }

  if (mindchangeRenderMode === 'normal' && (mindchangeMarkerStart || mindchangeMarkerEnd) && useBezier) {
    const sx = sourceX ?? 0;
    const sy = sourceY ?? 0;
    const tx = targetX ?? 0;
    const ty = targetY ?? 0;
    const t = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0, sourceNode, targetNode);
    let sourcePosition = Position.Right;
    let targetPosition = Position.Left;
    if (edgeType === 'objection') {
      const objectionY = sourceNode?.position?.y ?? 0;
      const anchorY = targetNode?.position?.y ?? 0;
      sourcePosition = objectionY < anchorY ? Position.Top : Position.Bottom;
      targetPosition = objectionY > anchorY ? Position.Top : Position.Bottom;
    }

    // Match MainEdgeRenderer orientation for objections: forward lane uses from->to, backward reverses coordinates but keeps positions
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
      return (
        <path data-edge-overlay={edgeId} d={mcPath} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
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
        <path data-edge-overlay={edgeId} d={mcPath} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
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
        <path d={mcPath} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />
      );
    }
  }

  if (useBezier) {
    // Always prefer the main edge renderer's computed path for highlight to ensure perfect alignment
    if (pathD) {
      return <path data-edge-overlay={edgeId} d={pathD} stroke="#000" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.85} />;
    }
  }

  // Special handling for comment edges - use blue highlight for better visibility
  if (edgeType === 'comment') {
    return (
      <line data-edge-overlay={edgeId} x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="#3b82f6" strokeWidth={6} strokeLinecap="round" opacity={0.9} />
    );
  }

  return (
    <line data-edge-overlay={edgeId} x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
  );
};
