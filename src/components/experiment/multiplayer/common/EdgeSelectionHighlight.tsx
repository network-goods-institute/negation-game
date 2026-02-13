import React from 'react';
import { getBezierPath, Position } from '@xyflow/react';
import { EdgeRouting } from './EdgeConfiguration';

interface EdgeSelectionHighlightProps {
  selected: boolean;
  shouldRenderOverlay: boolean;
  edgeId?: string;
  useBezier: boolean;
  routing?: EdgeRouting;
  curvature?: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceNode: any;
  targetNode: any;
  edgeType: string;
  pathD?: string;
  overlayStrokeWidth?: number;
}

export const EdgeSelectionHighlight: React.FC<EdgeSelectionHighlightProps> = ({
  selected,
  shouldRenderOverlay,
  edgeId,
  useBezier,
  routing,
  curvature,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNode,
  targetNode,
  edgeType,
  pathD,
  overlayStrokeWidth,
}) => {
  if (!shouldRenderOverlay || !selected) return null;

  const sw = overlayStrokeWidth ?? 12;

  if (routing === 'orthogonal' && pathD) {
    return (
      <path
        data-edge-overlay={edgeId}
        d={pathD}
        stroke="#000"
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    );
  }

  if (useBezier) {
    let sourcePosition = Position.Right;
    let targetPosition = Position.Left;
    if (edgeType === 'objection') {
      const objectionY = sourceNode?.position?.y ?? 0;
      const anchorY = targetNode?.position?.y ?? 0;
      sourcePosition = objectionY < anchorY ? Position.Bottom : Position.Top;
      targetPosition = objectionY > anchorY ? Position.Bottom : Position.Top;
    }
    const [d] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: curvature,
    });
    return <path data-edge-overlay={edgeId} d={d} stroke="#000" strokeWidth={sw} fill="none" strokeLinecap="round" opacity={0.85} />;
  }

  if (edgeType === 'comment') {
    return (
      <line data-edge-overlay={edgeId} x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="#3b82f6" strokeWidth={6} strokeLinecap="round" opacity={0.9} />
    );
  }

  return (
    <line data-edge-overlay={edgeId} x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="#000" strokeWidth={sw} strokeLinecap="round" opacity={0.85} />
  );
};
