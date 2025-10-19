import React from 'react';
import { createPortal } from 'react-dom';
import { getTrimmedLineCoords } from '@/utils/experiment/multiplayer/edgePathUtils';

interface MindchangeBadgesProps {
  edgeId: string;
  edgeType: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceNode: any;
  targetNode: any;
  mindchangeData: {
    forward: { average: number; count: number };
    backward: { average: number; count: number };
  };
  overlayActive: boolean;
  zoom: number;
  vx: number;
  vy: number;
}

export const MindchangeBadges: React.FC<MindchangeBadgesProps> = ({
  edgeId,
  edgeType,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNode,
  targetNode,
  mindchangeData,
  overlayActive,
  zoom,
  vx,
  vy,
}) => {
  if (!overlayActive) return null;
  if (edgeType !== 'negation' && edgeType !== 'objection') return null;

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
  const fTrim = getTrimmedLineCoords(sx, sy, tx, ty, perpX, perpY, sourceNode, targetNode);
  // Backward arrow tip (reversed orientation)
  const bTrim = getTrimmedLineCoords(sx, sy, tx, ty, -perpX, -perpY, sourceNode, targetNode);

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
      {hasForward && badge(fTrim.toX, fTrim.toY, fVal, `${edgeId}-mc-fwd`)}
      {hasBackward && badge(bTrim.fromX, bTrim.fromY, bVal, `${edgeId}-mc-bwd`)}
    </>
  );
};
