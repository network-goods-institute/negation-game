import React, { useEffect, useMemo } from 'react';
import { StraightEdge, EdgeProps, useReactFlow } from '@xyflow/react';
import { EdgeLabelRenderer } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { ContextMenu } from './common/ContextMenu';

export const NegationEdge: React.FC<EdgeProps> = (props) => {
  const { hoveredEdgeId, selectedEdgeId, setSelectedEdge, addObjectionForEdge, setHoveredEdge, updateEdgeAnchorPosition, deleteNode, updateEdgeRelevance, importanceSim } = useGraphActions() as any;
  const isHovered = hoveredEdgeId === props.id;
  const rf = useReactFlow();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{x:number;y:number}>({x:0,y:0});

  const sourceX = (props as any).sourceX;
  const sourceY = (props as any).sourceY;
  const targetX = (props as any).targetX;
  const targetY = (props as any).targetY;

  const { cx, cy } = useMemo(() => {
    return {
      cx: sourceX != null && targetX != null ? (sourceX + targetX) / 2 : 0,
      cy: sourceY != null && targetY != null ? (sourceY + targetY) / 2 : 0,
    };
  }, [sourceX, sourceY, targetX, targetY]);

  const lastPosRef = React.useRef<{x:number;y:number}|null>(null);
  const rafRef = React.useRef<number>(0);
  useEffect(() => {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    const last = lastPosRef.current;
    if (last && Math.abs(last.x - cx) < 0.5 && Math.abs(last.y - cy) < 0.5) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      lastPosRef.current = { x: cx, y: cy };
      updateEdgeAnchorPosition(props.id as string, cx, cy);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [cx, cy, props.id, updateEdgeAnchorPosition]);

  // Hide objection affordances if either endpoint is hidden
  const sNode = rf.getNode((props as any).source as string);
  const tNode = rf.getNode((props as any).target as string);
  const sHidden = !!(sNode as any)?.data?.hidden;
  const tHidden = !!(tNode as any)?.data?.hidden;
  const showAffordance = !(sHidden || tHidden);
  const selected = (selectedEdgeId || null) === (props.id as any);
  const relevance = Math.max(1, Math.min(5, ((props as any).data?.relevance ?? 3)));
  const srcFavor = (sNode as any)?.data?.favor ?? 3;
  const tgtFavor = (tNode as any)?.data?.favor ?? 3;
  const favorAvg = (srcFavor + tgtFavor) / 2;
  const speedFactor = (relevance / 3) * (isHovered ? 1.5 : 1) * (favorAvg / 3);
  const dashDuration = Math.max(1.5, 6 / Math.max(0.5, speedFactor));

  // Strap geometry (variable-width band along straight centerline)
  const strapMeta = React.useMemo(() => {
    if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY) || !Number.isFinite(targetX) || !Number.isFinite(targetY)) return null as string | null;
    const sx = sourceX as number, sy = sourceY as number, ex = targetX as number, ey = targetY as number;
    const dx = ex - sx, dy = ey - sy;
    const L = Math.hypot(dx, dy);
    if (!L || L < 4) return null;
    const ux = dx / L, uy = dy / L;
    const nx = -dy / L, ny = dx / L;
    const N = 64;
    const NECK_PX = 24;
    const MIN_CORE_PX = 2.0;
    // Base target area; scale by relevance for presence
    const areaPx = 800 * (relevance / 3);
    const smoothStep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const g: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r1 = smoothStep((L * t) / NECK_PX);
      const r2 = smoothStep((L * (1 - t)) / NECK_PX);
      const base = Math.min(1, r1) * Math.min(1, r2);
      // shallow mid attenuation for shape, not physics
      const bell = Math.exp(-Math.pow((t - 0.5) / 0.6, 2));
      g.push(Math.max(0, base * (0.85 + 0.15 * bell)));
    }
    let gInt = 0; const dt = 1 / N;
    for (let i = 1; i <= N; i++) gInt += 0.5 * (g[i - 1] + g[i]) * dt;
    const scale = Math.max(0, areaPx / (L * Math.max(1e-6, gInt)));
    // End bulbs for visual attachment
    const edgeSigma = 0.08; let bumpMax = 0; const bump: number[] = [];
    for (let i = 0; i <= N; i++) { const t = i / N; const b = Math.exp(-Math.pow(t / edgeSigma, 2)) + Math.exp(-Math.pow((1 - t) / edgeSigma, 2)); bump[i] = b; if (b > bumpMax) bumpMax = b; }
    for (let i = 0; i <= N; i++) bump[i] = bump[i] / (bumpMax || 1);
    const coreMask: number[] = [];
    for (let i = 0; i <= N; i++) { const t = i / N; const r1 = smoothStep((L * t) / NECK_PX); const r2 = smoothStep((L * (1 - t)) / NECK_PX); coreMask.push(Math.min(1, r1) * Math.min(1, r2)); }
    const midIndex = Math.floor(N / 2);
    const predMid = scale * g[midIndex];
    const bulbGain = Math.max(0, MIN_CORE_PX - predMid) * 1.25;
    const topPts: string[] = [];
    const botPts: string[] = [];
    const widths: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const cx = sx + dx * t; const cy = sy + dy * t;
      let w = Math.max(0, scale * g[i]);
      // widen by relevance a touch
      w *= (0.8 + 0.2 * (relevance / 3));
      w = Math.max(w, MIN_CORE_PX * coreMask[i]);
      w += bulbGain * bump[i];
      widths.push(w);
      const ox = (w / 2) * nx, oy = (w / 2) * ny;
      topPts.push(`${cx + ox},${cy + oy}`);
      botPts.push(`${cx - ox},${cy - oy}`);
    }
    const path = `M ${topPts.join(' L ')} L ${botPts.reverse().join(' L ')} Z`;
    const widthAt = (u: number) => {
      const t = Math.max(0, Math.min(1, u));
      const idx = t * N;
      const i0 = Math.floor(idx);
      const i1 = Math.min(N, i0 + 1);
      const frac = idx - i0;
      return widths[i0] * (1 - frac) + widths[i1] * frac;
    };
    const posAt = (u: number) => {
      const t = Math.max(0, Math.min(1, u));
      return { x: sx + dx * t, y: sy + dy * t };
    };
    return { path, widthAt, posAt, L, sx, sy, ex, ey };
  }, [sourceX, sourceY, targetX, targetY, relevance]);

  return (
    <>
      {/* Strap (background band) */}
      {strapMeta?.path && (
        <>
          <defs>
            <linearGradient id={`neg-strap-${props.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#111827" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#374151" stopOpacity={0.22} />
            </linearGradient>
          </defs>
          <path d={strapMeta.path} fill={`url(#neg-strap-${props.id})`} />
          <path d={strapMeta.path} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
        </>
      )}
      {/* Selection highlight behind edge */}
      {Number.isFinite(sourceX) && Number.isFinite(sourceY) && Number.isFinite(targetX) && Number.isFinite(targetY) && selected && (
        <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} stroke="#000" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
      )}
      <StraightEdge
        {...props}
        style={{
          strokeWidth: importanceSim ? (1 + relevance) : 2,
          stroke: '#ef4444',
        }}
        label="-"
        labelShowBg={false}
        labelStyle={{
          padding: 0,
          width: 20,
          height: 20,
          stroke: 'white',
          strokeWidth: 2,
          fontSize: 36,
          fontWeight: 600,
          fill: '#ef4444',
        }}
      />
      {showAffordance && (
        <>
          {/* Midpoint control: circle with minus */}
          <foreignObject x={cx - 8} y={cy - 8} width={16} height={16} style={{ pointerEvents: 'all' }}>
            <div onClick={(e) => { e.stopPropagation(); addObjectionForEdge(props.id as string, cx, cy); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }} title="Edge controls" className="w-4 h-4 rounded-full bg-white border flex items-center justify-center" style={{ borderColor: '#ef4444', cursor: 'pointer' }}>
              <div className="w-2 h-[2px] rounded-sm" style={{ backgroundColor: '#ef4444' }} />
            </div>
          </foreignObject>
          {null}
        </>
      )}
      {
      /* Always render the overlay; show stars only in importanceSim mode */
      (
      <EdgeLabelRenderer>
        <div
          style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${cx}px, ${cy + 18}px)`, zIndex: 1000, pointerEvents: 'all' }}
          onMouseEnter={() => setHoveredEdge(props.id as string)}
          onMouseLeave={() => setHoveredEdge(null)}
          className={`transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex items-center justify-center gap-2 bg-white/95 backdrop-blur-sm border rounded-md shadow px-2 py-1">
            {importanceSim && (
              <div className="flex items-center gap-1 text-[11px] select-none" title="Set edge relevance (simulation). 1 = low, 5 = high.">
                {[1,2,3,4,5].map((i) => (
                  <button key={`rel-${i}`} title={`Set relevance to ${i}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); updateEdgeRelevance?.(props.id as string, i as any); }}>
                    <span className={i <= relevance ? 'text-red-600' : 'text-stone-300'}>★</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); addObjectionForEdge(props.id as string, cx, cy); }}
              className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-stone-800 text-white"
              title="Add objection to this relation"
            >
              Object
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
      )}
      {/* Invisible interaction overlay along the whole edge for selection/context menu (on top) */}
      {Number.isFinite(sourceX) && Number.isFinite(sourceY) && Number.isFinite(targetX) && Number.isFinite(targetY) && (
        <line
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
          stroke="rgba(0,0,0,0)"
          strokeWidth={16}
          style={{ pointerEvents: 'stroke' }}
          onClick={(e) => { e.stopPropagation(); setSelectedEdge?.(props.id as string); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedEdge?.(props.id as string); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
        />
      )}
      {/* marching dots overlay on top (circles) */}
      {strapMeta && (
        <>
          <defs>
            <filter id={`neg-dotShadow-${props.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.7" floodOpacity="0.2" />
            </filter>
          </defs>
      <DotsAlongEdge id={String(props.id)} meta={strapMeta} favorAvg={favorAvg} />
        </>
      )}
      <ContextMenu
        open={menuOpen}
        x={menuPos.x}
        y={menuPos.y}
        onClose={() => setMenuOpen(false)}
        items={[
          { label: 'Relevance: ★☆☆☆☆', onClick: () => updateEdgeRelevance?.(props.id as string, 1) },
          { label: 'Relevance: ★★☆☆☆', onClick: () => updateEdgeRelevance?.(props.id as string, 2) },
          { label: 'Relevance: ★★★☆☆', onClick: () => updateEdgeRelevance?.(props.id as string, 3) },
          { label: 'Relevance: ★★★★☆', onClick: () => updateEdgeRelevance?.(props.id as string, 4) },
          { label: 'Relevance: ★★★★★', onClick: () => updateEdgeRelevance?.(props.id as string, 5) },
          { label: 'Delete edge', danger: true, onClick: () => deleteNode?.(props.id as string) },
        ]}
      />
    </>
  );
};

function DotsAlongEdge({ id, meta, favorAvg }: { id: string; meta: { L:number; sx:number; sy:number; ex:number; ey:number; widthAt:(u:number)=>number; posAt:(u:number)=>{x:number;y:number} }; favorAvg: number }) {
  const [reduced, setReduced] = React.useState(false);
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  React.useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const loop = () => { setT((v) => (v + 1) % 1_000_000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  const halfLen = meta.L / 2;
  const spacingBase = 28;
  const nTop = Math.max(3, Math.floor(halfLen / spacingBase));
  const nBot = nTop;
  const speedPx = 16 + (Math.max(1, Math.min(5, favorAvg)) - 1) * 14; // px/s driven by favor
  const now = (performance.now ? performance.now() : Date.now()) / 1000;
  const topDots = Array.from({ length: nTop }).map((_, j) => {
    const spacing = halfLen / nTop;
    const dist = reduced ? (j + 0.5) * spacing : ((now * speedPx) + j * spacing) % halfLen;
    const u = Math.min(0.5, dist / meta.L);
    const p = meta.posAt(u);
    const w = meta.widthAt(u);
    const r = Math.max(1.6, Math.min(7, w * 0.28));
    return { key: `t${j}`, cx: p.x, cy: p.y, r };
  });
  const botDots = Array.from({ length: nBot }).map((_, j) => {
    const spacing = halfLen / nBot;
    const dist = reduced ? (j + 0.5) * spacing : ((now * speedPx) + j * spacing) % halfLen;
    const u = Math.max(0.5, 1 - dist / meta.L);
    const p = meta.posAt(u);
    const w = meta.widthAt(u);
    const r = Math.max(1.6, Math.min(7, w * 0.28));
    return { key: `b${j}`, cx: p.x, cy: p.y, r };
  });
  return (
    <g filter={`url(#neg-dotShadow-${id})`}>
      {topDots.map((d) => (
        <circle key={d.key} cx={d.cx} cy={d.cy} r={d.r} fill="#fff" stroke="#0b1220" strokeWidth={1.5} />
      ))}
      {botDots.map((d) => (
        <circle key={d.key} cx={d.cx} cy={d.cy} r={d.r} fill="#fff" stroke="#0b1220" strokeWidth={1.5} />
      ))}
    </g>
  );
}
