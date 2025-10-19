import React, { useMemo } from 'react';
import { EdgeProps, getStraightPath, useReactFlow, useStore } from '@xyflow/react';
import { createPortal } from 'react-dom';
import { useAbsoluteNodePosition } from './common/useAbsoluteNodePosition';

export const MindchangeIndicatorEdge: React.FC<EdgeProps> = (props) => {
  const rf = useReactFlow();
  const { getRectPosition } = useAbsoluteNodePosition();
  const edgeData = (props as any).data;
  const edgeIdStr = String(props.id);
  const sx = (props as any).sourceX as number | undefined;
  const sy = (props as any).sourceY as number | undefined;
  const tx = (props as any).targetX as number | undefined;
  const ty = (props as any).targetY as number | undefined;
  const dir = (edgeData as any)?.direction as ('forward' | 'backward') | undefined;
  const rawVal = Number((edgeData as any)?.value ?? 0);
  const mag = Math.min(100, Math.abs(Math.round(rawVal)));
  const value = rawVal >= 0 ? mag : -mag;
  const [vx, vy, zoom] = useStore((s: any) => s.transform);

  const { pathD, labelX, labelY, markerId } = useMemo(() => {
    const srcX = Number.isFinite(sx as number) ? (sx as number) : 0;
    const srcY = Number.isFinite(sy as number) ? (sy as number) : 0;
    const tgtX = Number.isFinite(tx as number) ? (tx as number) : 0;
    const tgtY = Number.isFinite(ty as number) ? (ty as number) : 0;
    // Use node rects if present to compute exact boundary intersections
    const sRect = (edgeData as any)?.sourceRect as { cx: number; cy: number; w: number; h: number } | undefined;
    const tRect = (edgeData as any)?.targetRect as { cx: number; cy: number; w: number; h: number } | undefined;
    const intersectRect = (cx: number, cy: number, halfW: number, halfH: number, dirX: number, dirY: number) => {
      const adx = Math.abs(dirX);
      const ady = Math.abs(dirY);
      if (adx === 0 && ady === 0) return { x: cx, y: cy };
      const txScale = adx > 0 ? halfW / adx : Number.POSITIVE_INFINITY;
      const tyScale = ady > 0 ? halfH / ady : Number.POSITIVE_INFINITY;
      const t = Math.min(txScale, tyScale);
      return { x: cx + dirX * t, y: cy + dirY * t };
    };
    const axay = dir === 'backward' ? { ax: tgtX, ay: tgtY, bx: srcX, by: srcY } : { ax: srcX, ay: srcY, bx: tgtX, by: tgtY };
    let ax = axay.ax, ay = axay.ay, bx = axay.bx, by = axay.by;
    // Compute normal offset before trimming
    const dx0 = bx - ax;
    const dy0 = by - ay;
    const len0 = Math.max(1, Math.hypot(dx0, dy0));
    const k = 8;
    const offX = (-dy0 / len0) * (dir === 'forward' ? k : -k);
    const offY = (dx0 / len0) * (dir === 'forward' ? k : -k);

    let fromX = ax + offX;
    let fromY = ay + offY;
    let toX = bx + offX;
    let toY = by + offY;

    if (sRect && tRect) {
      const sCX = sRect.cx + offX;
      const sCY = sRect.cy + offY;
      const tCX = tRect.cx + offX;
      const tCY = tRect.cy + offY;
      const dirVX = tCX - sCX;
      const dirVY = tCY - sCY;
      const len = Math.max(1, Math.hypot(dirVX, dirVY));
      const ux = dirVX / len;
      const uy = dirVY / len;
      const start = intersectRect(sCX, sCY, sRect.w / 2, sRect.h / 2, ux, uy);
      const end = intersectRect(tCX, tCY, tRect.w / 2, tRect.h / 2, -ux, -uy);
      const startScale = Math.min(sRect.w, sRect.h);
      const endScale = Math.min(tRect.w, tRect.h);
      const padStart = Math.max(1, Math.min(6, startScale * 0.02));
      const padEnd = Math.max(1, Math.min(6, endScale * 0.02));
      fromX = start.x + ux * padStart;
      fromY = start.y + uy * padStart;
      toX = end.x - ux * padEnd;
      toY = end.y - uy * padEnd;
    } else {
      // Fallback to constant trim
      const txv = toX - fromX;
      const tyv = toY - fromY;
      const segLen = Math.max(1, Math.hypot(txv, tyv));
      const ux = txv / segLen;
      const uy = tyv / segLen;
      const trimStart = 8;
      const trimEnd = 10;
      fromX = fromX + ux * trimStart;
      fromY = fromY + uy * trimStart;
      toX = toX - ux * trimEnd;
      toY = toY - uy * trimEnd;
    }
    const [d] = getStraightPath({ sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY });
    const lx = toX;
    const ly = toY;
    const markerId = `mc-indicator-arrow-${edgeIdStr.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    return { pathD: d, labelX: lx, labelY: ly, markerId };
  }, [sx, sy, tx, ty, dir, edgeIdStr, edgeData]);

  const isNeg = value < 0;
  const stroke = isNeg ? '#f43f5e' : '#f59e0b';

  const maskId = `mcind-mask-${String(props.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  let srcRectEl: any = null;
  let tgtRectEl: any = null;
  try {
    const sNode = rf.getNode(String((props as any).source));
    const tNode = rf.getNode(String((props as any).target));
    srcRectEl = sNode ? getRectPosition(sNode, false) : null;
    tgtRectEl = tNode ? getRectPosition(tNode, false) : null;
  } catch { }

  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
        </marker>
        <mask id={maskId}>
          <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
          {srcRectEl && (
            <rect x={srcRectEl.x} y={srcRectEl.y} width={srcRectEl.width} height={srcRectEl.height} rx={srcRectEl.borderRadius} ry={srcRectEl.borderRadius} fill="black" />
          )}
          {tgtRectEl && (
            <rect x={tgtRectEl.x} y={tgtRectEl.y} width={tgtRectEl.width} height={tgtRectEl.height} rx={tgtRectEl.borderRadius} ry={tgtRectEl.borderRadius} fill="black" />
          )}
        </mask>
      </defs>
      <path d={pathD} fill="none" stroke={stroke} strokeOpacity={0.95} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} markerEnd={`url(#${markerId})`} mask={`url(#${maskId})`} />
      {(() => {
        const target = typeof document !== 'undefined' ? document.body : null;
        if (!target) return null;
        const left = (vx || 0) + labelX * (zoom || 1);
        const top = (vy || 0) + labelY * (zoom || 1);
        return createPortal(
          <div
            style={{
              position: 'fixed',
              left,
              top,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 110,
            }}
          >
            <span className={isNeg ? "px-2.5 py-1 text-[12px] leading-none font-semibold rounded bg-rose-50/95 border-2 border-rose-300 text-rose-700 select-none shadow-md" : "px-2.5 py-1 text-[12px] leading-none font-semibold rounded bg-amber-50/95 border-2 border-amber-300 text-amber-700 select-none shadow-md"}>
              {value > 0 ? `+${value}%` : `${value}%`}
            </span>
          </div>,
          target
        );
      })()}
    </g>
  );
};

export default MindchangeIndicatorEdge;