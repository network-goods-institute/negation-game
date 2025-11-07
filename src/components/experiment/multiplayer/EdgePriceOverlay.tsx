"use client";
import React from 'react';
import { useReactFlow, useViewport, getBezierPath, getStraightPath, Position } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { getTrimmedLineCoords } from '@/utils/experiment/multiplayer/edgePathUtils';
import { EDGE_CONFIGURATIONS, EdgeType } from './common/EdgeConfiguration';

interface EdgeLike {
  id: string;
  source: string;
  target: string;
  type?: string;
  selected?: boolean;
  data?: { market?: { price?: number | string } };
}

interface Props {
  edges: EdgeLike[];
  zoomThreshold?: number; // show when zoom <= threshold
  sizePx?: number; // nominal circle diameter in px at threshold zoom
}

export const EdgePriceOverlay: React.FC<Props> = ({ edges, zoomThreshold = 0.9, sizePx = 28 }) => {
  const rf = useReactFlow();
  const { zoom, x: vx, y: vy } = useViewport();
  const graph = useGraphActions() as any;
  const overlayActiveId = (graph as any)?.overlayActiveEdgeId as (string | null);
  const hoveredEdgeId = (graph as any)?.hoveredEdgeId as (string | null);
  const [tick, setTick] = React.useState(0);

  const show = zoom <= zoomThreshold;

  React.useEffect(() => {
    if (!show) return;
    let raf = 0;
    const loop = () => {
      setTick((t) => (t + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [show]);

  if (!show || !Array.isArray(edges) || edges.length === 0) return null;

  // Compute a clamped size multiplier relative to the threshold
  const scale = Math.max(0.25, Math.min(1, zoom / zoomThreshold));
  const computedSize = Math.max(12, Math.min(sizePx, Math.round(sizePx * scale)));

  const container = typeof document !== 'undefined' ? (document.querySelector('[data-testid="graph-canvas-root"]') as HTMLElement | null) : null;
  const containerRect = container?.getBoundingClientRect() ?? null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 6 }}>
      {edges.map((e) => {
        try {
          let price = Number((e as any)?.data?.market?.price);
          const t = (e.type || '').toLowerCase() as EdgeType | string;
          const isSupport = t === 'support';
          const isNegation = t === 'negation';
          const isObjection = t === 'objection';
          if (!isSupport && !isNegation && !isObjection) return null;

          // For objection edges that may not carry their own market price,
          // fall back to the base edge (via anchor node's parentEdgeId).
          if (!Number.isFinite(price) && isObjection) {
            try {
              const obj = rf.getEdge(String(e.id)) as any;
              const anchorId = String(obj?.target || '');
              if (anchorId && anchorId.startsWith('anchor:')) {
                const anchor = rf.getNode(anchorId) as any;
                const baseId = String(anchor?.data?.parentEdgeId || '');
                if (baseId) {
                  const base = rf.getEdge(baseId) as any;
                  const p2 = Number(base?.data?.market?.price);
                  if (Number.isFinite(p2)) price = p2;
                }
              }
            } catch { }
          }

          if (!Number.isFinite(price)) return null;
          if (e.selected || overlayActiveId === e.id || hoveredEdgeId === e.id) return null;

          let screenX: number | null = null;
          let screenY: number | null = null;

          // Prefer exact DOM position of the edge overlay anchor (which matches label placement)
          if (containerRect) {
            const anchor = document.querySelector(`[data-anchor-edge-id="${CSS.escape(String(e.id))}"]`) as HTMLElement | null;
            if (anchor) {
              const rect = anchor.getBoundingClientRect();
              screenX = rect.left + rect.width / 2 - containerRect.left;
              screenY = rect.top + rect.height / 2 - containerRect.top;
            }
          }

          if (screenX == null || screenY == null) {
            // Fallback: compute label coords from path
            const sn = rf.getNode(e.source) as any;
            const tn = rf.getNode(e.target) as any;
            if (!sn || !tn) return null;
            const sx = Number(sn?.position?.x ?? 0) + Number(sn?.width ?? sn?.measured?.width ?? 0) / 2;
            const sy = Number(sn?.position?.y ?? 0) + Number(sn?.height ?? sn?.measured?.height ?? 0) / 2;
            const tx = Number(tn?.position?.x ?? 0) + Number(tn?.width ?? tn?.measured?.width ?? 0) / 2;
            const ty = Number(tn?.position?.y ?? 0) + Number(tn?.height ?? tn?.measured?.height ?? 0) / 2;
            const trimmed = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0, sn, tn);
            try {
              const cfg = (EDGE_CONFIGURATIONS as any)[t] || undefined;
              if (cfg?.visual?.useBezier) {
                let sourcePosition = Position.Right;
                let targetPosition = Position.Left;
                if (t === 'objection') {
                  const objectionY = sy;
                  const anchorY = ty;
                  sourcePosition = objectionY < anchorY ? Position.Top : Position.Bottom;
                  targetPosition = objectionY > anchorY ? Position.Top : Position.Bottom;
                }
                const curvature = cfg?.visual?.curvature ?? 0.35;
                const [, lx, ly] = getBezierPath({
                  sourceX: trimmed.fromX,
                  sourceY: trimmed.fromY,
                  sourcePosition,
                  targetX: trimmed.toX,
                  targetY: trimmed.toY,
                  targetPosition,
                  curvature,
                });
                screenX = lx * zoom + vx;
                screenY = ly * zoom + vy;
              } else {
                const [, lx, ly] = getStraightPath({
                  sourceX: trimmed.fromX,
                  sourceY: trimmed.fromY,
                  targetX: trimmed.toX,
                  targetY: trimmed.toY,
                });
                screenX = lx * zoom + vx;
                screenY = ly * zoom + vy;
              }
            } catch {
              screenX = ((trimmed.fromX + trimmed.toX) / 2) * zoom + vx;
              screenY = ((trimmed.fromY + trimmed.toY) / 2) * zoom + vy;
            }
          }

          const p = Math.max(0, Math.min(1, price));
          const size = computedSize;
          const color = isSupport ? '#10b981' : (isNegation ? '#ef4444' : '#f59e0b');

          const fillRect = () => {
            if (isObjection) {
              const h = Math.round(size * p);
              const y = size - h;
              return (
                <g clipPath={`url(#edge-clip-${e.id})`}>
                  <g transform={`rotate(-45 ${size / 2} ${size / 2})`}>
                    <rect x={0} y={y} width={size} height={h} fill={color} />
                  </g>
                </g>
              );
            }
            const fillHeight = Math.round(size * p);
            const rectY = isSupport ? (size - fillHeight) : 0;
            const rectH = fillHeight;
            return (
              <g clipPath={`url(#edge-clip-${e.id})`}>
                <rect x={0} y={rectY} width={size} height={rectH} fill={color} />
              </g>
            );
          };

          return (
            <div
              key={`e-zoom-${e.id}`}
              className="absolute"
              style={{ left: screenX!, top: screenY!, transform: 'translate(-50%, -50%)' }}
            >
              <svg width={size} height={size} className="drop-shadow-sm">
                <defs>
                  <clipPath id={`edge-clip-${e.id}`}>
                    <circle cx={size / 2} cy={size / 2} r={size / 2} />
                  </clipPath>
                </defs>
                <circle cx={size / 2} cy={size / 2} r={(size / 2) - 1} fill="#ffffff" stroke="#e5e7eb" strokeWidth={1} />
                {fillRect()}
                <circle cx={size / 2} cy={size / 2} r={(size / 2) - 1} fill="none" stroke="#334155" strokeOpacity={0.15} strokeWidth={1} />
              </svg>
            </div>
          );
        } catch {
          return null;
        }
      })}
    </div>
  );
};
