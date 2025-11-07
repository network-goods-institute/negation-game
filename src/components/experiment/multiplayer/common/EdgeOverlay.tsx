import React from 'react';
import { EdgeLabelRenderer, useStore, useReactFlow } from '@xyflow/react';
import { createPortal } from 'react-dom';
import { MarketContextMenu } from './MarketContextMenu';
import { InlineBuyControls } from '../market/InlineBuyControls';
import { InlinePriceHistory } from '../market/InlinePriceHistory';
import { useGraphActions } from '../GraphContext';
import { usePersistencePointerHandlers } from './usePersistencePointerHandlers';
import { EdgeTypeToggle } from './EdgeTypeToggle';
import { MindchangeEditor } from './MindchangeEditor';
import { MindchangeIndicators } from './MindchangeIndicators';
import { breakdownCache } from './MindchangeBreakdown';
import { isMindchangeEnabledClient } from '@/utils/featureFlags';

const EDGE_ANCHOR_SIZE = 36;
const PERSISTENCE_PADDING = 14;
const PERSISTENCE_PADDING_HORIZONTAL = 60;

export interface EdgeOverlayProps {
  cx: number;
  cy: number;
  isHovered: boolean;
  selected?: boolean;
  edgeId: string;
  edgeType?: string;
  srcX?: number;
  srcY?: number;
  tgtX?: number;
  tgtY?: number;
  marketPrice?: number;
  marketMine?: number;
  marketTotal?: number;
  marketInfluence?: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onAddObjection: () => void;
  onToggleEdgeType?: () => void;
  onConnectionClick?: (x: number, y: number) => void;
  starColor?: string;
  sourceLabel?: string;
  targetLabel?: string;
  mindchange?: {
    forward: { average: number; count: number };
    backward: { average: number; count: number };
    userValue?: { forward?: number; backward?: number };
  };
  relevance?: number;
  onUpdateRelevance?: (relevance: number) => void;
  suppress?: boolean;
  suppressReason?: string;
}

export const EdgeOverlay: React.FC<EdgeOverlayProps> = ({
  cx,
  cy,
  isHovered,
  selected = false,
  edgeId,
  edgeType,
  marketPrice,
  marketMine,
  marketTotal,
  marketInfluence,
  onMouseEnter,
  onMouseLeave,
  onAddObjection,
  onToggleEdgeType,
  onConnectionClick,
  starColor = 'text-stone-600',
  mindchange,
  relevance,
  onUpdateRelevance,
  suppress = false,
  suppressReason,
}) => {
  const rf = useReactFlow();
  const graph = useGraphActions();
  const overlayActiveId = (graph as any)?.overlayActiveEdgeId as (string | null);
  const setOverlayActive = (graph as any)?.setOverlayActiveEdge as ((id: string | null) => void) | undefined;
  const [overlayOpen, setOverlayOpen] = React.useState<boolean>(Boolean(selected || overlayActiveId === edgeId));
  const [anchorHover, setAnchorHover] = React.useState<boolean>(false);
  const [isNearOverlay, setIsNearOverlay] = React.useState<boolean>(false);
  const { grabMode = false, connectMode = false } = useGraphActions();

  const {
    handlePersistencePointerDown,
    handlePersistencePointerMove,
    handlePersistencePointerUp,
    handlePersistencePointerLeave,
  } = usePersistencePointerHandlers({ grabMode });

  const [tx, ty, zoom] = useStore((s: any) => s.transform);
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const anchorNode = useStore((s: any) => s.nodeInternals?.get?.(`anchor:${edgeId}`));
  const baseX = typeof anchorNode?.position?.x === 'number' ? anchorNode.position.x : cx;
  const baseY = typeof anchorNode?.position?.y === 'number' ? anchorNode.position.y : cy;

  const fallbackScreenLeft = tx + baseX * zoom;
  const fallbackScreenTop = ty + baseY * zoom;

  const [anchorScreenPos, setAnchorScreenPos] = React.useState<{ x: number; y: number } | null>(null);

  const portalContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [buyOpen, setBuyOpen] = React.useState(false);
  const [buyPos, setBuyPos] = React.useState<{ x: number; y: number } | null>(null);
  const buyContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [hoverBuy, setHoverBuy] = React.useState(false);
  const docId = React.useMemo(() => {
    try { return window.location.pathname.split('/').pop() || ''; } catch { return ''; }
  }, []);
  const handlePortalMouseDown = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
  }, []);
  const handlePortalMouseMove = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.buttons & 1) === 0) {
      return;
    }
    event.stopPropagation();
  }, []);
  const handleConnectionAwareClick = React.useCallback((e: React.MouseEvent, normalAction: () => void) => {
    if (connectMode && onConnectionClick) {
      e.stopPropagation();
      const sx = (anchorScreenPos?.x ?? fallbackScreenLeft);
      const sy = (anchorScreenPos?.y ?? fallbackScreenTop);
      onConnectionClick(sx, sy);
      return;
    }
    normalAction();
  }, [connectMode, onConnectionClick, anchorScreenPos?.x, anchorScreenPos?.y, fallbackScreenLeft, fallbackScreenTop]);

  const rawForwardAvg = Math.round(Number((mindchange as any)?.forward?.average ?? 0));
  const rawBackwardAvg = Math.round(Number((mindchange as any)?.backward?.average ?? 0));

  const getCachedAvg = (dir: 'forward' | 'backward') => {
    const key = `${edgeId}:${dir}`;
    const cached = breakdownCache.get(key);
    if (!cached || !cached.data || cached.data.length === 0) return null;
    const sum = cached.data.reduce((a, b) => a + (Number(b.value) || 0), 0);
    return Math.round(sum / cached.data.length);
  };
  const displayForwardAvg = rawForwardAvg === 0 ? (getCachedAvg('forward') ?? 0) : rawForwardAvg;
  const displayBackwardAvg = rawBackwardAvg === 0 ? (getCachedAvg('backward') ?? 0) : rawBackwardAvg;

  const [cacheTick, setCacheTick] = React.useState(0);

  const prefetchBreakdowns = React.useCallback(async () => {
    if (!isMindchangeEnabledClient()) return;
    if (!(graph as any)?.getMindchangeBreakdown) return;
    if (edgeType !== 'negation' && edgeType !== 'objection') return;
    const now = Date.now();
    const fKey = `${edgeId}:forward`;
    const bKey = `${edgeId}:backward`;
    const isFresh = (k: string) => { const c = breakdownCache.get(k); return !!c && (now - c.ts) < 30000; };
    const fFresh = isFresh(fKey);
    const bFresh = isFresh(bKey);
    if (fFresh && bFresh) return;
    try {
      const res = await (graph as any).getMindchangeBreakdown(edgeId);
      const ts = Date.now();
      if (!fFresh) breakdownCache.set(fKey, { ts, data: res.forward });
      if (!bFresh) breakdownCache.set(bKey, { ts, data: res.backward });
      setCacheTick((t) => t + 1);
    } catch { }
  }, [graph, edgeId, edgeType]);

  // Mindchange editor/UI state
  const [editDir, setEditDir] = React.useState<null | 'forward' | 'backward'>(null);
  const [value, setValue] = React.useState<number>(Math.abs(rawForwardAvg));
  const initializedKeyRef = React.useRef<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = React.useState(false);

  // If overlay is suppressed (e.g., while dragging), force-close and don't render HUD
  React.useEffect(() => {
    if (suppress) {
      setOverlayOpen(false);
      setAnchorHover(false);
      setIsNearOverlay(false);
    }
  }, [suppress]);

  React.useLayoutEffect(() => {
    if (typeof document === 'undefined') {
      setAnchorScreenPos(null);
      return;
    }
    const anchorId = `anchor:${edgeId}`;
    const compute = () => {
      const el = document.querySelector(`[data-id="${anchorId}"]`) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        setAnchorScreenPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      } else {
        setAnchorScreenPos(null);
      }
    };
    compute();
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('resize', compute);
    };
  }, [edgeId, tx, ty, zoom, baseX, baseY]);

  React.useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    const labelEl = document.querySelector(`[data-anchor-edge-id="${edgeId}"]`) as HTMLElement | null;
    if (labelEl) {
      const rect = labelEl.getBoundingClientRect();
      setAnchorScreenPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
  }, [edgeId, tx, ty, zoom]);

  const showHUD = Boolean(overlayOpen) && !suppress && !grabMode;

  const mcForIndicators = React.useMemo(() => {
    if (!mindchange) return undefined;
    const fwdAvg = Number((mindchange as any)?.forward?.average ?? 0);
    const fwdCnt = Number((mindchange as any)?.forward?.count ?? 0);
    const bwdAvg = Number((mindchange as any)?.backward?.average ?? 0);
    const bwdCnt = Number((mindchange as any)?.backward?.count ?? 0);
    const uv = (mindchange as any)?.userValue;
    const f = Number(uv?.forward);
    const b = Number(uv?.backward);
    type MCShape = NonNullable<React.ComponentProps<typeof MindchangeIndicators>['mindchange']>;
    const base: MCShape = { forward: { average: fwdAvg, count: fwdCnt }, backward: { average: bwdAvg, count: bwdCnt } };
    if (Number.isFinite(f) && Number.isFinite(b)) {
      const withUser: MCShape = { ...base, userValue: { forward: f, backward: b } };
      return withUser;
    }
    return base;
  }, [mindchange]);
  React.useEffect(() => {
    try {
      if (showHUD) setOverlayActive?.(edgeId);
      else if (overlayActiveId === edgeId) setOverlayActive?.(null);
    } catch { }
  }, [showHUD, edgeId, setOverlayActive, overlayActiveId]);

  // When conditions request opening, claim active edge id immediately
  React.useEffect(() => {
    if (suppress) return;
    if (selected || isHovered || anchorHover || isNearOverlay) {
      setOverlayOpen(true);
      try { setOverlayActive?.(edgeId); } catch { }
    } else {
      setOverlayOpen(false);
      try { if (overlayActiveId === edgeId) setOverlayActive?.(null); } catch { }
    }
  }, [selected, isHovered, anchorHover, isNearOverlay, suppress, edgeId, setOverlayActive, overlayActiveId]);

  React.useEffect(() => {
    if (!isMindchangeEnabledClient()) { initializedKeyRef.current = null; return; }
    if (!editDir) { initializedKeyRef.current = null; return; }
    const initKey = `${edgeId}:${editDir}`;
    if (initializedKeyRef.current === initKey) return;
    try { prefetchBreakdowns(); } catch { }
    const user = (mindchange as any)?.userValue as { forward?: number; backward?: number } | undefined;
    let seed: number | undefined;
    if (user && typeof user[editDir] === 'number' && user[editDir] !== undefined) {
      // If user has an explicit value (including 0), use it once as the seed
      seed = Math.abs(Number(user[editDir]));
    } else {
      const me = (graph as any)?.currentUserId as (string | undefined);
      const findMine = (dir: 'forward' | 'backward'): number | null => {
        try {
          const key = `${edgeId}:${dir}`;
          const cached = breakdownCache.get(key);
          if (!cached || !cached.data || !Array.isArray(cached.data)) return null;
          const rec = (cached.data as any[]).find((r) => me && r?.userId === me);
          return rec ? Math.abs(Number(rec.value || 0)) : null;
        } catch { return null; }
      };
      const mine = findMine(editDir);
      if (mine != null && Number.isFinite(mine) && mine > 0) {
        seed = mine;
      } else {
        const avg = editDir === 'forward' ? Number(displayForwardAvg) : Number(displayBackwardAvg);
        seed = Math.abs(Number.isFinite(avg) ? avg : 0);
      }
    }
    if (!Number.isFinite(seed)) seed = 100;
    setValue(Math.max(0, Math.min(100, Math.round(seed as number))));
    initializedKeyRef.current = initKey;
  }, [editDir, mindchange, displayForwardAvg, displayBackwardAvg, cacheTick, graph, edgeId, prefetchBreakdowns]);

  const handleSaveMindchange = async () => {
    if (!graph.setMindchange || !editDir || isSaving) return;
    setIsSaving(true);
    try {
      const v = Math.max(0, Math.min(100, Math.round(value)));
      const params = editDir === 'forward' ? { forward: v } : { backward: v };
      await graph.setMindchange(edgeId, params);
      try {
        const key = `${edgeId}:${editDir}` as const;
        breakdownCache.set(key, { ts: 0, data: [] });
        setCacheTick((t) => t + 1);
      } catch { }
      setEditDir(null);
    } finally {
      setIsSaving(false);
    }
  };

  const mindchangeNextDir = (graph as any)?.mindchangeNextDir as ('forward' | 'backward' | null);
  const mindchangeEdgeId = (graph as any)?.mindchangeEdgeId as (string | null);
  const setMindchangeNextDirFn = (graph as any)?.setMindchangeNextDir as ((v: 'forward' | 'backward' | null) => void) | undefined;
  const lastOpenKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!isMindchangeEnabledClient()) return;
    if (edgeType !== 'negation' && edgeType !== 'objection') return;
    if (!selected) { lastOpenKeyRef.current = null; return; }
    if (mindchangeEdgeId !== edgeId || !mindchangeNextDir) return;
    const key = `${edgeId}:${mindchangeNextDir}`;
    if (lastOpenKeyRef.current === key) return;
    lastOpenKeyRef.current = key;
    setEditDir(mindchangeNextDir);
    try { setMindchangeNextDirFn?.(null); } catch { }
  }, [selected, edgeId, edgeType, mindchangeNextDir, mindchangeEdgeId, setMindchangeNextDirFn]);

  React.useEffect(() => {
    const lockForMindchange = Boolean((graph as any)?.mindchangeMode) &&
      (((graph as any)?.mindchangeEdgeId as string | null) === edgeId || Boolean(editDir));
    if (suppress) { setOverlayOpen(false); return; }
    if (buyOpen) { setOverlayOpen(true); try { setOverlayActive?.(edgeId); } catch { }; return; }
    if (lockForMindchange) { setOverlayOpen(true); try { setOverlayActive?.(edgeId); } catch { }; return; }
    if (selected) { setOverlayOpen(true); try { setOverlayActive?.(edgeId); } catch { }; return; }
    if (isHovered) { setOverlayOpen(true); try { setOverlayActive?.(edgeId); } catch { }; return; }
    if (anchorHover) { setOverlayOpen(true); try { setOverlayActive?.(edgeId); } catch { }; return; }
    if (!isNearOverlay) setOverlayOpen(false);
  }, [selected, isHovered, anchorHover, isNearOverlay, graph, edgeId, editDir, suppress, setOverlayActive, buyOpen]);

  React.useEffect(() => {
    if (!buyOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node | null;
      const inHud = !!portalContainerRef.current && portalContainerRef.current.contains(t as Node);
      const inBuy = !!buyContainerRef.current && buyContainerRef.current.contains(t as Node);
      if (inHud || inBuy) return;
      setBuyOpen(false);
      setOverlayOpen(false);
      try { if (overlayActiveId === edgeId) setOverlayActive?.(null); } catch { }
    };
    window.addEventListener('pointerdown', handler, { capture: true } as any);
    return () => window.removeEventListener('pointerdown', handler, { capture: true } as any);
  }, [buyOpen, overlayActiveId, edgeId, setOverlayActive]);

  // Prevent browser page zoom (Ctrl/⌘ + wheel) while interacting with the overlay/buy UI
  React.useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if ((overlayOpen || buyOpen || isNearOverlay || anchorHover) && (e.ctrlKey || (e as any).metaKey)) {
        try { e.preventDefault(); } catch { }
      }
    };
    window.addEventListener('wheel', onWheel, { capture: true, passive: false } as any);
    return () => window.removeEventListener('wheel', onWheel as any, { capture: true } as any);
  }, [overlayOpen, buyOpen, isNearOverlay, anchorHover]);

  // Do not auto-close editor based on global mindchangeMode; editor can be opened directly

  return (
    <React.Fragment>
      <EdgeLabelRenderer>
        <div
          data-testid="edge-overlay-anchor"
          data-anchor-edge-id={edgeId}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${cx}px, ${cy}px)`,
            width: EDGE_ANCHOR_SIZE,
            height: EDGE_ANCHOR_SIZE,
            zIndex: 1,
            pointerEvents: 'auto',
          }}
          onMouseEnter={(e) => {
            onMouseEnter();
            setAnchorHover(true);
            prefetchBreakdowns();
            try {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setAnchorScreenPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            } catch { }
            try { setOverlayActive?.(edgeId); } catch { }
          }}
          onMouseLeave={() => { onMouseLeave(); setAnchorHover(false); }}
        />
      </EdgeLabelRenderer>

      {portalTarget && showHUD && createPortal(
        <div
          ref={portalContainerRef}
          data-edge-overlay-container={edgeId}
          style={{
            position: 'fixed',
            left: anchorScreenPos?.x ?? fallbackScreenLeft,
            top: anchorScreenPos?.y ?? fallbackScreenTop,
            transform: 'translate(-50%, -50%)',
            zIndex: 60,
            pointerEvents: 'none',
          }}
          onMouseDown={handlePortalMouseDown}
          onMouseMove={handlePortalMouseMove}
        >
          <div style={{ transformOrigin: 'center', pointerEvents: 'none' }}>
            <div
              style={{
                transformOrigin: 'center',
                pointerEvents: 'none',
                paddingTop: PERSISTENCE_PADDING,
                paddingBottom: 0,
                paddingLeft: PERSISTENCE_PADDING_HORIZONTAL,
                paddingRight: PERSISTENCE_PADDING_HORIZONTAL,
                marginTop: -PERSISTENCE_PADDING,
                marginBottom: 0,
                marginLeft: -PERSISTENCE_PADDING_HORIZONTAL,
                marginRight: -PERSISTENCE_PADDING_HORIZONTAL,
              }}
            >
              <div
                className="relative inline-block"
                style={{
                  paddingLeft: '56px',
                  paddingRight: '56px',
                  marginLeft: '-56px',
                  marginRight: '-56px',
                }}
              >
                <div
                  className="flex items-center justify-center gap-4 bg-gradient-to-b from-white to-gray-50/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-lg shadow-black/10 px-4 py-2.5 transition-all duration-300 hover:shadow-xl hover:shadow-black/15"
                  style={{ pointerEvents: 'auto' }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try { (graph as any)?.clearNodeSelection?.(); } catch { }
                    try { (graph as any)?.setSelectedEdge?.(edgeId); } catch { }
                    setMenuPos({ x: e.clientX, y: e.clientY });
                    setMenuOpen(true);
                  }}
                  onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onPointerDown={handlePersistencePointerDown}
                  onPointerMove={handlePersistencePointerMove}
                  onPointerUp={handlePersistencePointerUp}
                  onPointerCancel={handlePersistencePointerUp}
                  onPointerLeave={handlePersistencePointerLeave}
                  onMouseEnter={() => setIsNearOverlay(true)}
                  onMouseLeave={() => setIsNearOverlay(false)}
                >
                  {(edgeType === "support" || edgeType === "negation") && onToggleEdgeType && !editDir && (
                    <EdgeTypeToggle
                      edgeType={edgeType}
                      onToggle={onToggleEdgeType}
                      onMouseEnter={() => setIsNearOverlay(true)}
                      onMouseLeave={() => setIsNearOverlay(false)}
                    />
                  )}

                  {(() => {
                    const marketEnabled = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === 'true';
                    if (isMindchangeEnabledClient() || marketEnabled) return null;
                    const rel = Math.max(1, Math.min(5, Math.round(Number(relevance || 0))));
                    if (edgeType === 'support' || edgeType === 'negation') {
                      return (
                        <div className="flex items-center gap-0.5 px-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <button
                              key={`rel-${i}`}
                              title={`Set relevance to ${i}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); onUpdateRelevance?.(i); })}
                              type="button"
                              data-interactive="true"
                              className="transition-transform hover:scale-110 active:scale-95"
                            >
                              <span className={`text-base font-bold transition-all ${i <= rel ? starColor : 'text-gray-300'}`}>
                                {edgeType === 'support' ? '+' : '-'}
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    }
                    if (edgeType === 'objection') {
                      return (
                        <div className="flex items-center gap-2.5 text-xs select-none relative">
                          <span className="text-xs font-semibold text-gray-700">Relevance:</span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <button
                                key={`obj-rel-${i}`}
                                title={`Set relevance to ${i}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); onUpdateRelevance?.(i); })}
                                type="button"
                                data-interactive="true"
                                className="transition-transform hover:scale-125 active:scale-95"
                              >
                                <span className={`text-base transition-all ${i <= rel ? starColor + ' drop-shadow-sm' : 'text-gray-300'}`}>★</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {(edgeType === 'negation' || edgeType === 'objection') && !editDir && (() => {
                    if (!isMindchangeEnabledClient()) return null;
                    const handleClick = (e: React.MouseEvent) => handleConnectionAwareClick(e, () => {
                      e.stopPropagation();
                      try { prefetchBreakdowns(); } catch { }
                      (graph as any)?.beginMindchangeOnEdge?.(edgeId);
                    });
                    return (
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleClick}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50 active:scale-95 transition-all duration-150 border border-gray-200"
                      >
                        Mindchange
                      </button>
                    );
                  })()}

                  {/* Buy circle (inline, left of Mitigate) */}
                  {(() => {
                    const priceNum = Number(marketPrice as number);
                    if (!Number.isFinite(priceNum)) return null;
                    const size = 20;
                    const t = (edgeType || '').toLowerCase();
                    const isSupport = t === 'support';
                    const isNegation = t === 'negation';
                    const isObjection = t === 'objection';
                    const color = isSupport ? '#10b981' : (isNegation ? '#ef4444' : '#f59e0b');
                    const fill = () => {
                      const p = Math.max(0, Math.min(1, priceNum));
                      if (isObjection) {
                        const h = Math.round(size * p);
                        const y = size - h;
                        return (
                          <g clipPath={`url(#edge-mini-clip-inline-${edgeId})`}>
                            <g transform={`rotate(-45 ${size / 2} ${size / 2})`}>
                              <rect x={0} y={y} width={size} height={h} fill={color} />
                            </g>
                          </g>
                        );
                      }
                      const h = Math.round(size * p);
                      const y = isSupport ? (size - h) : 0;
                      return (
                        <g clipPath={`url(#edge-mini-clip-inline-${edgeId})`}>
                          <rect x={0} y={y} width={size} height={h} fill={color} />
                        </g>
                      );
                    };
                    return (
                      <div
                        className="relative ml-2 -m-1 p-1 rounded-full bg-white border border-stone-200"
                        onMouseEnter={() => setHoverBuy(true)}
                        onMouseLeave={() => setHoverBuy(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const sx = (anchorScreenPos?.x ?? fallbackScreenLeft);
                          const sy = (anchorScreenPos?.y ?? fallbackScreenTop);
                          setBuyPos({ x: sx, y: sy });
                          setBuyOpen(true);
                        }}
                        style={{ pointerEvents: 'auto' }}
                      >
                        <button
                          type="button"
                          aria-label="Buy"
                          className="h-7 w-7 rounded-full bg-transparent border border-transparent shadow-none transition flex items-center justify-center"
                        >
                          <svg width={size} height={size}>
                            <defs><clipPath id={`edge-mini-clip-inline-${edgeId}`}><circle cx={size / 2} cy={size / 2} r={size / 2} /></clipPath></defs>
                            <circle cx={size / 2} cy={size / 2} r={(size / 2) - 1} fill="#ffffff" stroke="#e5e7eb" strokeWidth={1} />
                            {fill()}
                            <circle cx={size / 2} cy={size / 2} r={(size / 2) - 1} fill="none" stroke="#334155" strokeOpacity={0.15} strokeWidth={1} />
                          </svg>
                        </button>
                        {hoverBuy && (
                          <div
                            data-testid="buy-circle-tooltip"
                            className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 rounded-md shadow-md ${isObjection ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-stone-200'}`}
                            style={{ width: '220px', pointerEvents: 'none' }}
                          >
                            <InlinePriceHistory
                              entityId={edgeId}
                              docId={docId}
                              currentPrice={priceNum}
                              variant={isObjection ? 'objection' : 'default'}
                              className="w-full"
                              compact={true}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {!editDir && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleConnectionAwareClick(e, () => {
                        e.stopPropagation();
                        onAddObjection();
                        setOverlayOpen(false);
                        setOverlayActive?.(null);
                      })}
                      type="button"
                      data-interactive="true"
                      className="rounded-lg px-4 py-1.5 text-xs font-semibold bg-gradient-to-b from-gray-800 to-gray-900 text-white shadow-md hover:shadow-lg hover:from-gray-700 hover:to-gray-800 active:scale-95 transition-all duration-150 border border-gray-700"
                    >
                      Mitigate
                    </button>
                  )}

                  {editDir && (
                    // Editor only available when feature enabled
                    <MindchangeEditor
                      value={value}
                      isSaving={isSaving}
                      edgeType={edgeType}
                      onValueChange={setValue}
                      onSave={handleSaveMindchange}
                      onCancel={() => {
                        setEditDir(null);
                        try { (graph as any)?.setSelectedEdge?.(null); } catch { }
                        (graph as any)?.cancelMindchangeSelection?.();
                      }}
                      onClear={(() => {
                        const me = (graph as any)?.currentUserId as (string | undefined);
                        const getDirUserVal = (dir: 'forward' | 'backward'): number => {
                          const local = Number((mindchange as any)?.userValue?.[dir] || 0) || 0;
                          if (local > 0) return local;
                          try {
                            const key = `${edgeId}:${dir}`;
                            const cached = breakdownCache.get(key);
                            if (!cached || !cached.data || !Array.isArray(cached.data)) return 0;
                            const rec = (cached.data as any[]).find((r) => me && r?.userId === me);
                            return rec ? Number(rec.value || 0) : 0;
                          } catch { return 0; }
                        };
                        const present = editDir ? getDirUserVal(editDir) : 0;
                        return present > 0 ? async () => {
                          if (!graph.setMindchange || !editDir || isSaving) return;
                          setIsSaving(true);
                          try {
                            const params = editDir === 'forward' ? { forward: 0 } : { backward: 0 };
                            await graph.setMindchange(edgeId, params);
                            try {
                              const key = `${edgeId}:${editDir}` as const;
                              breakdownCache.set(key, { ts: 0, data: [] });
                              setCacheTick((t) => t + 1);
                            } catch { }
                            setEditDir(null);
                            try { (graph as any)?.setSelectedEdge?.(null); } catch { }
                            (graph as any)?.cancelMindchangeSelection?.();
                          } finally {
                            setIsSaving(false);
                          }
                        } : undefined;
                      })()}
                    />
                  )}

                  {(edgeType === 'negation' || edgeType === 'objection') && !hoverBuy && (
                    isMindchangeEnabledClient() ? (
                      <MindchangeIndicators
                        edgeId={edgeId}
                        edgeType={edgeType}
                        mindchange={mcForIndicators}
                      />
                    ) : null
                  )}

                </div>
              </div>
            </div>
          </div>

          {buyOpen && buyPos && portalTarget && createPortal(
            <div
              ref={buyContainerRef}
              className="fixed z-[9998]"
              style={{ left: buyPos.x, top: buyPos.y, transform: 'translate(-50%, 8px)', pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <InlineBuyControls
                entityId={edgeId}
                price={Number(marketPrice as number)}
                initialOpen
                onDismiss={() => setBuyOpen(false)}
                variant={(edgeType === 'objection') ? 'objection' : 'default'}
              />
            </div>,
            portalTarget
          )}

          <MarketContextMenu
            open={menuOpen}
            x={menuPos.x}
            y={menuPos.y}
            onClose={() => setMenuOpen(false)}
            kind="edge"
            entityId={edgeId}
            onDelete={() => { try { (graph as any)?.deleteNode?.(edgeId); } catch { } }}
          />
        </div>,
        portalTarget
      )}
    </React.Fragment>
  );
};

