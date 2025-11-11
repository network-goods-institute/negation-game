"use client";
import React from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { normalizeSecurityId } from '@/utils/market/marketUtils';
import { getTrimmedLineCoords } from '@/utils/experiment/multiplayer/edgePathUtils';

type Props = { docId: string | null };

const DELTA_CACHE = new Map<string, { updatedAt: number; delta: number | null }>();
const DELTA_TTL = 60_000;

export const MiniHoverStats: React.FC<Props> = ({ docId }) => {
  const rf = useReactFlow();
  const { x: vx, y: vy, zoom } = useViewport();
  const graph = useGraphActions() as any;
  const hoveredNodeId: string | null = graph?.hoveredNodeId ?? null;
  const hoveredEdgeId: string | null = graph?.hoveredEdgeId ?? null;
  const overlayEdgeId: string | null = graph?.overlayActiveEdgeId ?? null;

  const [pct, setPct] = React.useState<number | null>(null);
  const [delta, setDelta] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const [maxWidthPx, setMaxWidthPx] = React.useState<number | null>(null);

  const computePosition = React.useCallback(() => {
    try {
      const container = document.querySelector('[data-testid="graph-canvas-root"]') as HTMLElement | null;
      if (!container) { setPos(null); return; }
      if (hoveredNodeId) {
        try {
          const selNode = rf.getNode(hoveredNodeId) as any;
          if (selNode?.selected) { setPos(null); return; }
        } catch { }
        // Prefer DOM position of node
        try {
          const nodeEl = document.querySelector(`.react-flow__node[data-id="${CSS.escape(String(hoveredNodeId))}"]`) as HTMLElement | null;
          if (nodeEl) {
            const rect = nodeEl.getBoundingClientRect();
            const rootRect = container.getBoundingClientRect();
            const left = (rect.left - rootRect.left) + rect.width / 2; // center of node
            const top = rect.top - rootRect.top - 40;
            setPos({ x: left, y: top });
            setMaxWidthPx(Math.max(0, Math.floor(rect.width)));
            return;
          }
        } catch { }
        // Fallback to flow coords
        const n = rf.getNode(hoveredNodeId) as any;
        if (!n) { setPos(null); return; }
        const w = Number(n?.width ?? n?.measured?.width ?? 0);
        const x = ((n.position?.x ?? 0) + (Number.isFinite(w) ? w / 2 : 0)) * zoom + vx;
        const y = (n.position?.y ?? 0) * zoom + vy;
        try {
          if (Number.isFinite(w) && w > 0) setMaxWidthPx(Math.max(0, Math.floor(w * zoom)));
        } catch { }
        setPos({ x, y: y - 40 });
        return;
      }
      const targetEdgeId = (hoveredEdgeId || overlayEdgeId) as string | null;
      if (targetEdgeId) {
        // Prefer the edge overlay container (portal) for exact top-left
        try {
          const overlayContainer = document.querySelector(`[data-edge-overlay-container="${CSS.escape(String(targetEdgeId))}"]`) as HTMLElement | null;
          if (overlayContainer) {
            const rect = overlayContainer.getBoundingClientRect();
            const rootRect = container.getBoundingClientRect();
            const left = (rect.left - rootRect.left) + rect.width / 2; // center of overlay container
            const top = rect.top - rootRect.top - 32;
            setPos({ x: left, y: top });
            // For edges, cap width by relevant node widths.
            try {
              const e = rf.getEdges().find((ee: any) => String(ee.id) === String(targetEdgeId)) as any;
              if (e) {
                const isObjection = String(e.type || '') === 'objection';
                let sw = 0;
                let tw = 0;
                if (isObjection) {
                  // Prefer the objection node width; anchor nodes are tiny.
                  const objNode = rf.getNode(e.source) as any;
                  sw = Number(objNode?.width ?? objNode?.measured?.width ?? 0);
                  const anchor = rf.getNode(e.target) as any;
                  const baseId = String(anchor?.data?.parentEdgeId || '');
                  if (baseId) {
                    const base = rf.getEdges().find((ee: any) => String(ee.id) === baseId) as any;
                    const bs = rf.getNode(base?.source) as any;
                    const bt = rf.getNode(base?.target) as any;
                    const bsw = Number(bs?.width ?? bs?.measured?.width ?? 0);
                    const btw = Number(bt?.width ?? bt?.measured?.width ?? 0);
                    tw = Math.min(bsw || 0, btw || 0);
                  } else {
                    tw = sw;
                  }
                } else {
                  const sn = rf.getNode(e.source) as any;
                  const tn = rf.getNode(e.target) as any;
                  sw = Number(sn?.width ?? sn?.measured?.width ?? 0);
                  tw = Number(tn?.width ?? tn?.measured?.width ?? 0);
                }
                const cap = Math.max(0, Math.floor(Math.min(sw || 0, tw || 0) * zoom));
                setMaxWidthPx(cap > 0 ? cap : null);
              }
            } catch { }
            return;
          }
        } catch { }
        // Next: Prefer overlay stroke elements if present
        try {
          const selector = `[data-edge-overlay="${CSS.escape(String(targetEdgeId))}"]`;
          const overlayEls = Array.from(document.querySelectorAll(selector)) as SVGGraphicsElement[];
          const containerRect = container.getBoundingClientRect();
          if (overlayEls.length > 0) {
            let minLeft = Number.POSITIVE_INFINITY;
            let minTop = Number.POSITIVE_INFINITY;
            let maxRight = Number.NEGATIVE_INFINITY;
            for (const el of overlayEls) {
              const r = el.getBoundingClientRect();
              if (r.left < minLeft) minLeft = r.left;
              if (r.top < minTop) minTop = r.top;
              const right = r.left + r.width;
              if (right > maxRight) maxRight = right;
            }
            if (Number.isFinite(minLeft) && Number.isFinite(minTop) && Number.isFinite(maxRight)) {
              const centerLeft = (minLeft + maxRight) / 2;
              const left = centerLeft - containerRect.left;
              const top = minTop - containerRect.top - 32;
              setPos({ x: left, y: top });
              try {
                const e = rf.getEdges().find((ee: any) => String(ee.id) === String(targetEdgeId)) as any;
                if (e) {
                  const isObjection = String(e.type || '') === 'objection';
                  let sw = 0, tw = 0;
                  if (isObjection) {
                    const objNode = rf.getNode(e.source) as any;
                    sw = Number(objNode?.width ?? objNode?.measured?.width ?? 0);
                    const anchor = rf.getNode(e.target) as any;
                    const baseId = String(anchor?.data?.parentEdgeId || '');
                    if (baseId) {
                      const base = rf.getEdges().find((ee: any) => String(ee.id) === baseId) as any;
                      const bs = rf.getNode(base?.source) as any;
                      const bt = rf.getNode(base?.target) as any;
                      const bsw = Number(bs?.width ?? bs?.measured?.width ?? 0);
                      const btw = Number(bt?.width ?? bt?.measured?.width ?? 0);
                      tw = Math.min(bsw || 0, btw || 0);
                    } else {
                      tw = sw;
                    }
                  } else {
                    const sn = rf.getNode(e.source) as any;
                    const tn = rf.getNode(e.target) as any;
                    sw = Number(sn?.width ?? sn?.measured?.width ?? 0);
                    tw = Number(tn?.width ?? tn?.measured?.width ?? 0);
                  }
                  const cap = Math.max(0, Math.floor(Math.min(sw || 0, tw || 0) * zoom));
                  setMaxWidthPx(cap > 0 ? cap : null);
                }
              } catch { }
              return;
            }
          }
        } catch { }
        // Fallback: compute from trimmed straight segment between node borders
        const e = rf.getEdges().find((ee: any) => String(ee.id) === String(targetEdgeId)) as any;
        if (!e) { setPos(null); return; }
        const sn = rf.getNode(e.source) as any;
        const tn = rf.getNode(e.target) as any;
        if (!sn || !tn) { setPos(null); return; }
        const sx = Number(sn.position?.x ?? 0) + Number(sn.width ?? 0) / 2;
        const sy = Number(sn.position?.y ?? 0) + Number(sn.height ?? 0) / 2;
        const tx = Number(tn.position?.x ?? 0) + Number(tn.width ?? 0) / 2;
        const ty = Number(tn.position?.y ?? 0) + Number(tn.height ?? 0) / 2;
        const tcoords = getTrimmedLineCoords(sx, sy, tx, ty, 0, 0, sn, tn);
        const midX = (tcoords.fromX + tcoords.toX) / 2;
        const topFlow = Math.min(tcoords.fromY, tcoords.toY);
        const left = midX * zoom + vx;
        const top = topFlow * zoom + vy - 32;
        setPos({ x: left, y: top });
        try {
          const edge = rf.getEdges().find((ee: any) => String(ee.id) === String(targetEdgeId)) as any;
          const isObjection = String(edge?.type || '') === 'objection';
          let sw2 = Number(sn?.width ?? sn?.measured?.width ?? 0);
          let tw2 = Number(tn?.width ?? tn?.measured?.width ?? 0);
          if (isObjection) {
            // Use objection node width and attempt to include base edge widths if available
            const anchor = tn;
            const baseId = String(anchor?.data?.parentEdgeId || '');
            if (baseId) {
              const base = rf.getEdges().find((ee: any) => String(ee.id) === baseId) as any;
              const bs = rf.getNode(base?.source) as any;
              const bt = rf.getNode(base?.target) as any;
              const bsw = Number(bs?.width ?? bs?.measured?.width ?? 0);
              const btw = Number(bt?.width ?? bt?.measured?.width ?? 0);
              tw2 = Math.min(bsw || 0, btw || 0);
            } else {
              tw2 = sw2;
            }
          }
          const cap = Math.max(0, Math.floor(Math.min(sw2 || 0, tw2 || 0) * zoom));
          setMaxWidthPx(cap > 0 ? cap : null);
        } catch { }
        return;
      }
      setPos(null);
      setMaxWidthPx(null);
    } catch { setPos(null); }
  }, [hoveredNodeId, hoveredEdgeId, overlayEdgeId, rf, vx, vy, zoom]);

  React.useEffect(() => {
    // Start a rAF loop while something is hovered/active to keep position in sync with zoom/pan/drag
    let rafId: number | null = null;
    const tick = () => {
      computePosition();
      rafId = requestAnimationFrame(tick);
    };
    if (hoveredNodeId || hoveredEdgeId || overlayEdgeId) {
      rafId = requestAnimationFrame(tick);
    } else {
      computePosition();
    }
    return () => { if (rafId != null) cancelAnimationFrame(rafId); };
  }, [hoveredNodeId, hoveredEdgeId, overlayEdgeId, computePosition]);

  React.useEffect(() => {
    let aborted = false;
    const id = hoveredNodeId || hoveredEdgeId || overlayEdgeId || null;
    if (!id || !docId) { setPct(null); setDelta(null); setLoading(false); return; }
    const norm = normalizeSecurityId(id);
    try {
      if (hoveredNodeId) {
        const n = rf.getNode(hoveredNodeId) as any;
        const p = Number(n?.data?.market?.price);
        if (Number.isFinite(p)) setPct(p);
      } else if (hoveredEdgeId || overlayEdgeId) {
        const targetEdgeId = (hoveredEdgeId || overlayEdgeId) as string;
        const e = rf.getEdges().find((ee: any) => String(ee.id) === String(targetEdgeId)) as any;
        const p = Number(e?.data?.market?.price);
        if (Number.isFinite(p)) setPct(p);
      }
    } catch { }

    const cacheKey = `${docId}::${norm}`;
    const cached = DELTA_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.updatedAt < DELTA_TTL) {
      setDelta(cached.delta);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/market/${encodeURIComponent(docId)}/price-history`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ securityId: norm, limit: 100 }),
        });
        if (!res.ok) { setDelta(null); setLoading(false); return; }
        const arr = await res.json();
        const history: Array<{ timestamp: string; price: number }> = Array.isArray(arr) ? arr : [];
        if (history.length === 0) { setDelta(null); setLoading(false); return; }
        const last = history[history.length - 1];
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        let baseline = history[0];
        for (let i = history.length - 1; i >= 0; i--) {
          const ts = Date.parse(history[i].timestamp);
          if (Number.isFinite(ts) && ts <= cutoff) { baseline = history[i]; break; }
        }
        const p = Number(last.price);
        const b = Number(baseline.price);
        const d = Number.isFinite(p) && Number.isFinite(b) ? (p - b) : null;
        DELTA_CACHE.set(cacheKey, { updatedAt: Date.now(), delta: d });
        if (!aborted) { setDelta(d); setLoading(false); }
      } catch { if (!aborted) { setPct(null); setDelta(null); } }
    })();
    return () => { aborted = true; };
  }, [hoveredNodeId, hoveredEdgeId, overlayEdgeId, docId, rf]);

  React.useEffect(() => {
    const onRefresh = () => { try { DELTA_CACHE.clear(); } catch { } };
    window.addEventListener('market:refresh', onRefresh as any);
    return () => window.removeEventListener('market:refresh', onRefresh as any);
  }, []);

  try {
    if (hoveredNodeId) {
      const n = rf.getNode(hoveredNodeId) as any;
      if (n?.selected) return null;
    }
  } catch { }
  if (!pos || pct == null) return null;
  const d = delta ?? 0;
  const color = d > 0 ? 'text-emerald-600' : d < 0 ? 'text-rose-600' : 'text-stone-800';
  const sign = d > 0 ? '+' : d < 0 ? '' : '';
  const fontSizePx = Math.max(10, Math.min(13, 12 + (zoom - 1) * 2));

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 7 }}>
      <div
        className={`absolute bg-white subpixel-antialiased border border-stone-200 rounded-md shadow-sm px-2.5 py-1.5 flex items-center gap-1 font-sans ${color}`}
        style={{ left: Math.round(pos.x), top: Math.round(pos.y), transform: 'translate(-50%, 0)', maxWidth: maxWidthPx != null ? `${maxWidthPx}px` : undefined, minWidth: 140, fontSize: fontSizePx }}
      >
        {/* Always show immediate price (chance) */}
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">{(pct * 100).toFixed(1)}% chance</span>
        {/* Show loading state just for the change, then update */}
        {loading ? (
          <span className="whitespace-nowrap overflow-hidden text-ellipsis text-stone-500 flex items-center gap-1">
            <span>(</span>
            <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-300 border-t-emerald-500 animate-spin" />
            <span>)</span>
          </span>
        ) : (
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">{d !== 0 ? `(${sign}${(Math.abs(d) * 100).toFixed(1)}%)` : '(0.0%)'}</span>
        )}
      </div>
    </div>
  );
};


