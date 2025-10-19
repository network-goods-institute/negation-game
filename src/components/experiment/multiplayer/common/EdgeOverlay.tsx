import React from 'react';
import { EdgeLabelRenderer, useReactFlow, useStore } from '@xyflow/react';
import { createPortal } from 'react-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu } from "../common/ContextMenu";
import { useGraphActions } from '../GraphContext';

const EDGE_ANCHOR_SIZE = 36;
const PERSISTENCE_PADDING = 14;
const PERSISTENCE_PADDING_HORIZONTAL = 60;
const INTERACTIVE_TARGET_SELECTOR = 'button, [role="button"], a, input, textarea, select, [data-interactive="true"]';

// commented to death because i spent like 3 hours on this

const breakdownCache: Map<string, { ts: number; data: Array<{ userId: string; username: string; value: number }> }> = new Map();

export interface EdgeOverlayProps {
  cx: number;
  cy: number;
  isHovered: boolean;
  selected?: boolean;
  relevance: number;
  edgeId: string;
  edgeType?: string;
  srcX?: number;
  srcY?: number;
  tgtX?: number;
  tgtY?: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onUpdateRelevance: (relevance: number) => void;
  onAddObjection: () => void;
  onToggleEdgeType?: () => void;
  onConnectionClick?: () => void;
  starColor?: string;
  sourceLabel?: string;
  targetLabel?: string;
  mindchange?: {
    forward: { average: number; count: number };
    backward: { average: number; count: number };
    userValue?: { forward: number; backward: number };
  };
}

export const EdgeOverlay: React.FC<EdgeOverlayProps> = ({
  cx,
  cy,
  isHovered,
  selected = false,
  relevance,
  edgeId,
  edgeType,
  onMouseEnter,
  onMouseLeave,
  onUpdateRelevance,
  onAddObjection,
  onToggleEdgeType,
  onConnectionClick,
  starColor = 'text-stone-600',
  sourceLabel,
  targetLabel,
  mindchange,
}) => {
  const [overlayOpen, setOverlayOpen] = React.useState<boolean>(Boolean(selected));
  const [anchorHover, setAnchorHover] = React.useState<boolean>(false);
  const [isNearOverlay, setIsNearOverlay] = React.useState<boolean>(false);
  const reactFlow = useReactFlow();
  const { grabMode = false, connectMode = false } = useGraphActions();
  const graph = useGraphActions();
  const enableMindchange = typeof process !== 'undefined' && ["true", "1", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE || '').toLowerCase());

  const MindchangeBreakdown: React.FC<{ dir: 'forward' | 'backward'; edgeId: string }> = ({ dir, edgeId }) => {
    const [items, setItems] = React.useState<Array<{ userId: string; username: string; value: number }>>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    React.useEffect(() => {
      let mounted = true;
      (async () => {
        if (!graph.getMindchangeBreakdown) return;
        try {
          const key = `${edgeId}:${dir}`;
          const now = Date.now();
          const cached = breakdownCache.get(key);
          if (cached && (now - cached.ts) < 30000) {
            if (mounted) setItems(cached.data);
            if (mounted) setLoading(false);
            return;
          }
          const res = await graph.getMindchangeBreakdown(edgeId);
          const data = dir === 'forward' ? res.forward : res.backward;
          breakdownCache.set(key, { ts: now, data });
          if (!mounted) return;
          setItems(data);
          setLoading(false);
        } catch { }
      })();
      return () => { mounted = false; };
    }, [edgeId, dir]);
    return (
      <div className="text-xs">
        <div className="mb-1 text-[11px] text-gray-600">{loading ? 'Loading…' : `Contributors: ${items.length}`}</div>
        {loading ? (
          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" /> Loading…</div>
        ) : items.length === 0 ? <div>No data</div> : (
          <div className="max-h-40 overflow-auto min-w-40">
            {items.map((it) => {
              const canon = Number(it.value) || 0;
              const disp = edgeType === 'support' ? -canon : canon;
              return (
                <div key={it.userId} className="flex justify-between gap-4"><span>{it.username}</span><span>{disp > 0 ? `+${disp}%` : `${disp}%`}</span></div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // React Flow viewport transform: [translateX, translateY, zoom]
  const [tx, ty, zoom] = useStore((s: any) => s.transform);

  // Where we'll render the floating HUD
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const anchorNode = useStore((s: any) => s.nodeInternals?.get?.(`anchor:${edgeId}`));
  const baseX = typeof anchorNode?.position?.x === 'number' ? anchorNode.position.x : cx;
  const baseY = typeof anchorNode?.position?.y === 'number' ? anchorNode.position.y : cy;

  const fallbackScreenLeft = tx + baseX * zoom;
  const fallbackScreenTop = ty + baseY * zoom;

  const [anchorScreenPos, setAnchorScreenPos] = React.useState<{ x: number; y: number } | null>(null);
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

  const showHUD = Boolean(overlayOpen);
  React.useEffect(() => {
    try {
      if (showHUD) (graph as any)?.setOverlayActiveEdge?.(edgeId);
      else if ((graph as any)?.overlayActiveEdgeId === edgeId) (graph as any)?.setOverlayActiveEdge?.(null);
    } catch { }
    return () => {
      try {
        if ((graph as any)?.overlayActiveEdgeId === edgeId) (graph as any)?.setOverlayActiveEdge?.(null);
      } catch { }
    };
  }, [showHUD, edgeId, graph]);
  React.useEffect(() => {
    // Overlay visibility policy:
    // 1) If edge becomes selected, open; if it becomes unselected, close unless within proximity
    // 2) If anchor hovered, open
    // 3) If open and within proximity, keep open
    if (selected) {
      setOverlayOpen(true);
      return;
    }
    if (anchorHover) {
      setOverlayOpen(true);
      return;
    }
    setOverlayOpen(isNearOverlay ? true : false);
  }, [selected, anchorHover, isNearOverlay]);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = portalContainerRef.current;
      if (!el || !overlayOpen) {
        setIsNearOverlay(false);
        return;
      }
      const rect = el.getBoundingClientRect();
      const expanded = {
        left: rect.left - 75,
        top: rect.top - 75,
        right: rect.right + 75,
        bottom: rect.bottom + 75,
      };
      const inside = e.clientX >= expanded.left && e.clientX <= expanded.right && e.clientY >= expanded.top && e.clientY <= expanded.bottom;
      setIsNearOverlay(inside);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove as any);
  }, [overlayOpen]);

  React.useLayoutEffect(() => {
    if (!showHUD || typeof document === 'undefined') return;
    try {
      const labelEl = document.querySelector(`[data-anchor-edge-id="${edgeId}"]`) as HTMLElement | null;
      if (labelEl) {
        const rect = labelEl.getBoundingClientRect();
        setAnchorScreenPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        return;
      }
      const nodeEl = document.querySelector(`[data-id="anchor:${edgeId}"]`) as HTMLElement | null;
      if (nodeEl) {
        const rect = nodeEl.getBoundingClientRect();
        setAnchorScreenPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
    } catch { }
  }, [showHUD, edgeId, tx, ty, zoom]);

  React.useEffect(() => {
    if (!selected && !isHovered) {
      setAnchorHover(false);
    }
  }, [selected, isHovered]);

  const isSupportEdge = edgeType === "support";
  const isNegationEdge = edgeType === "negation";
  const activeEdgeLabel = isSupportEdge ? "Supports" : isNegationEdge ? "Negates" : null;
  const activeEdgeTone = isSupportEdge ? "text-emerald-600" : isNegationEdge ? "text-rose-600" : "text-stone-500";




  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const panSessionRef = React.useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    viewport: { x: number; y: number; zoom: number };
  } | null>(null);
  const pointerUpdateRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const stopPanSession = React.useCallback(() => {
    panSessionRef.current = null;
    // Cancel any pending RAF updates
    if (pointerUpdateRef.current !== null) {
      cancelAnimationFrame(pointerUpdateRef.current);
      pointerUpdateRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (pointerUpdateRef.current !== null) {
        cancelAnimationFrame(pointerUpdateRef.current);
      }
    };
  }, []);

  const handlePersistencePointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!reactFlow) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const isMiddleButton = event.button === 1;
    const isTouchGesture = event.pointerType === 'touch';
    const isSpaceDrag = event.button === 0 && isSpacePressed;
    const isHandDrag = grabMode && event.button === 0 && event.pointerType === 'mouse';

    if (isHandDrag && target?.closest(INTERACTIVE_TARGET_SELECTOR)) {
      return;
    }

    if (!(isMiddleButton || isSpaceDrag || isTouchGesture || isHandDrag)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const viewport = reactFlow?.getViewport();
    if (!viewport) {
      return;
    }

    panSessionRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      viewport,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch { }
  }, [grabMode, isSpacePressed, reactFlow]);

  const handlePersistencePointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - session.lastX;
    const deltaY = event.clientY - session.lastY;

    session.lastX = event.clientX;
    session.lastY = event.clientY;

    const nextViewport = {
      x: session.viewport.x + deltaX,
      y: session.viewport.y + deltaY,
      zoom: session.viewport.zoom,
    };

    session.viewport = nextViewport;

    // Cancel any pending update
    if (pointerUpdateRef.current !== null) {
      cancelAnimationFrame(pointerUpdateRef.current);
    }

    // Batch updates with RAF for smoother panning
    pointerUpdateRef.current = requestAnimationFrame(() => {
      reactFlow?.setViewport(nextViewport, { duration: 0 });
      pointerUpdateRef.current = null;
    });
  }, [reactFlow]);

  const handlePersistencePointerUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch { }

    stopPanSession();
  }, [stopPanSession]);

  const handlePersistencePointerLeave = React.useCallback(() => {
    stopPanSession();
  }, [stopPanSession]);

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
      onConnectionClick();
      return;
    }

    normalAction();
  }, [connectMode, onConnectionClick]);

  const portalContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = portalContainerRef.current;
    if (!el) return;

    const handleWheel = (event: WheelEvent) => {
      // Block ALL wheel events including browser page zoom (pinch-to-zoom with ctrlKey)
      // This prevents the page from zooming when hovering over the edge overlay
      event.stopPropagation();
      event.preventDefault();
    };
    el.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      el.removeEventListener('wheel', handleWheel, { capture: true } as any);
    };
  }, [showHUD]);

  const rawForwardAvg = Math.round(Number((mindchange as any)?.forward?.average ?? 0));
  const rawBackwardAvg = Math.round(Number((mindchange as any)?.backward?.average ?? 0));
  const signedForwardAvg = edgeType === 'support' ? -rawForwardAvg : rawForwardAvg;
  const signedBackwardAvg = edgeType === 'support' ? -rawBackwardAvg : rawBackwardAvg;

  const getCachedAvg = (dir: 'forward' | 'backward') => {
    const key = `${edgeId}:${dir}`;
    const cached = breakdownCache.get(key);
    if (!cached || !cached.data || cached.data.length === 0) return null;
    const sum = cached.data.reduce((a, b) => a + (Number(b.value) || 0), 0);
    return Math.round(sum / cached.data.length);
  };
  const displayForwardAvg = signedForwardAvg === 0 ? (edgeType === 'support' ? -(getCachedAvg('forward') ?? 0) : (getCachedAvg('forward') ?? 0)) : signedForwardAvg;
  const displayBackwardAvg = signedBackwardAvg === 0 ? (edgeType === 'support' ? -(getCachedAvg('backward') ?? 0) : (getCachedAvg('backward') ?? 0)) : signedBackwardAvg;
  const fmtSign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  const [mcLoading, setMcLoading] = React.useState<{ forward: boolean; backward: boolean }>({ forward: false, backward: false });
  const [, setCacheTick] = React.useState(0);

  const prefetchBreakdowns = React.useCallback(async () => {
    if (!graph.getMindchangeBreakdown) return;
    const now = Date.now();
    const fKey = `${edgeId}:forward`;
    const bKey = `${edgeId}:backward`;
    const fFresh = (() => { const c = breakdownCache.get(fKey); return !!c && (now - c.ts) < 30000; })();
    const bFresh = (() => { const c = breakdownCache.get(bKey); return !!c && (now - c.ts) < 30000; })();
    if (fFresh && bFresh) return;
    setMcLoading({ forward: !fFresh, backward: !bFresh });
    try {
      const res = await graph.getMindchangeBreakdown(edgeId);
      const ts = Date.now();
      if (!fFresh) breakdownCache.set(fKey, { ts, data: res.forward });
      if (!bFresh) breakdownCache.set(bKey, { ts, data: res.backward });
    } catch { }
    setMcLoading({ forward: false, backward: false });
    setCacheTick((t) => t + 1);
  }, [graph, edgeId]);


  const [editDir, setEditDir] = React.useState<null | 'forward' | 'backward'>(null);
  const [value, setValue] = React.useState<number>(Math.abs(rawForwardAvg));
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!editDir) return;
    const user = (mindchange as any)?.userValue as { forward?: number; backward?: number } | undefined;
    let seed: number | undefined;
    if (user && typeof user[editDir] === 'number') {
      seed = Math.abs(Number(user[editDir]));
    } else {
      const avg = editDir === 'forward' ? Number(displayForwardAvg) : Number(displayBackwardAvg);
      seed = Math.abs(Number.isFinite(avg) ? avg : 0);
    }
    if (!Number.isFinite(seed) || (seed as number) <= 0) seed = 100;
    setValue(Math.max(0, Math.min(100, Math.round(seed as number))));
  }, [editDir, mindchange, displayForwardAvg, displayBackwardAvg]);

  const handleSaveMindchange = async () => {
    if (!graph.setMindchange || !editDir || isSaving) return;
    setIsSaving(true);
    try {
      const v = Math.max(0, Math.min(100, Math.round(value)));
      const params = editDir === 'forward' ? { forward: v } : { backward: v };
      await graph.setMindchange(edgeId, params);
      setEditDir(null);
    } finally {
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    const nextDir = (graph as any)?.mindchangeNextDir as ('forward' | 'backward' | null);
    const activeEdgeId = (graph as any)?.mindchangeEdgeId as (string | null);
    if (selected && activeEdgeId === edgeId && nextDir) {
      setEditDir(nextDir);
    }
  }, [selected, edgeId, graph]);

  React.useEffect(() => {
    const isMindchange = Boolean((graph as any)?.mindchangeMode);
    if (!isMindchange && editDir) {
      setEditDir(null);
    }
  }, [graph, editDir]);



  return (
    <React.Fragment>
      {/* 1) Small hover anchor stays in the edge-label layer */}
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
          }}
          onMouseLeave={() => { onMouseLeave(); setAnchorHover(false); }}
        />
      </EdgeLabelRenderer>

      {/* 2) HUD is portaled to <body>, so it sits above nodes */}
      {portalTarget && showHUD && createPortal(
        // Outer: position at the anchor in screen-space, anchor X center / Y top
        <div
          ref={portalContainerRef}
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
          <div
            style={{
              transformOrigin: 'center',
              pointerEvents: 'none',
            }}
          >
            {/* Persistence area - buffer on top and sides, no bottom buffer */}
            <div
              style={{
                transformOrigin: 'center',
                pointerEvents: 'none',
                paddingTop: PERSISTENCE_PADDING,
                paddingBottom: 0,
                paddingLeft: enableMindchange ? PERSISTENCE_PADDING_HORIZONTAL : PERSISTENCE_PADDING,
                paddingRight: enableMindchange ? PERSISTENCE_PADDING_HORIZONTAL : PERSISTENCE_PADDING,
                marginTop: -PERSISTENCE_PADDING,
                marginBottom: 0,
                marginLeft: enableMindchange ? -PERSISTENCE_PADDING_HORIZONTAL : -PERSISTENCE_PADDING,
                marginRight: enableMindchange ? -PERSISTENCE_PADDING_HORIZONTAL : -PERSISTENCE_PADDING,
              }}
            >
              <div
                className="relative inline-block"
                style={{
                  paddingLeft: enableMindchange ? '56px' : '0',
                  paddingRight: enableMindchange ? '56px' : '0',
                  marginLeft: enableMindchange ? '-56px' : '0',
                  marginRight: enableMindchange ? '-56px' : '0',
                }}
              >
                <div
                  className="flex items-center justify-center gap-4 bg-gradient-to-b from-white to-gray-50/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-lg shadow-black/10 px-4 py-2.5 transition-all duration-300 hover:shadow-xl hover:shadow-black/15"
                  style={{
                    pointerEvents: 'auto',
                  }}
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
                >
                  {(edgeType === "support" || edgeType === "negation") && onToggleEdgeType && !editDir && (
                    <div className="flex items-center gap-3 text-xs select-none relative">
                      {activeEdgeLabel && (
                        <span className={`font-bold tracking-tight ${activeEdgeTone}`}>{activeEdgeLabel}</span>
                      )}
                      <div
                        data-testid="toggle-edge-type"
                        role="button"
                        tabIndex={0}
                        data-interactive="true"
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-gray-300/50 shadow-inner transition-all duration-200 ${edgeType === "support" ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-rose-400 to-rose-500"}`}
                        onClickCapture={(e) => { e.stopPropagation(); onToggleEdgeType?.(); }}
                        onMouseEnter={() => setIsNearOverlay(true)}
                        onMouseLeave={() => setIsNearOverlay(false)}
                      >
                        <div className={`pointer-events-none flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${edgeType === "support" ? "translate-x-5" : "translate-x-0.5"}`}>
                          <div style={{ position: "relative", width: "12px", height: "12px" }}>
                            {edgeType === "support" ? (
                              <>
                                <div style={{ position: "absolute", left: "50%", top: "50%", width: "10px", height: "2px", backgroundColor: "#10b981", transform: "translate(-50%, -50%) rotate(0deg)", borderRadius: "1px" }} />
                                <div style={{ position: "absolute", left: "50%", top: "50%", width: "10px", height: "2px", backgroundColor: "#10b981", transform: "translate(-50%, -50%) rotate(90deg)", borderRadius: "1px" }} />
                              </>
                            ) : (
                              <div style={{ position: "absolute", left: "50%", top: "50%", width: "10px", height: "2px", backgroundColor: "#f43f5e", transform: "translate(-50%, -50%) rotate(0deg)", borderRadius: "1px" }} />
                            )}
                          </div>
                        </div>
                      </div>
                      <TooltipProvider>
                        <div className="flex items-center gap-0.5 px-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Tooltip key={`rel-${i}`}>
                              <TooltipTrigger asChild>
                                <button
                                  title={`Set relevance to ${i}`}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); onUpdateRelevance(i); })}
                                  type="button"
                                  data-interactive="true"
                                  className="transition-transform hover:scale-110 active:scale-95"
                                >
                                  <span className={`text-base font-bold transition-all ${i <= relevance ? starColor : 'text-gray-300'}`}>
                                    {edgeType === "support" ? "+" : "-"}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs z-[70]">Relevance: {i}/5</TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    </div>
                  )}

                  {null}

                  {(edgeType !== "support" && edgeType !== "negation") && (
                    <div className="flex items-center gap-2.5 text-xs select-none relative">
                      <span className="text-xs font-semibold text-gray-700">Relevance:</span>
                      <TooltipProvider>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Tooltip key={`star-${i}`}>
                              <TooltipTrigger asChild>
                                <button
                                  title={`Set relevance to ${i}`}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); onUpdateRelevance(i); })}
                                  type="button"
                                  data-interactive="true"
                                  className="transition-transform hover:scale-125 active:scale-95"
                                >
                                  <span className={`text-base transition-all ${i <= relevance ? starColor + ' drop-shadow-sm' : 'text-gray-300'}`}>★</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs z-[70]">
                                Relevance: {i}/5
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    </div>
                  )}

                  {!enableMindchange && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); onAddObjection(); })}
                      type="button"
                      data-interactive="true"
                      className="rounded-lg px-4 py-1.5 text-xs font-semibold bg-gradient-to-b from-gray-800 to-gray-900 text-white shadow-md hover:shadow-lg hover:from-gray-700 hover:to-gray-800 active:scale-95 transition-all duration-150 border border-gray-700"
                      title="Add mitigation to this relation"
                    >
                      Mitigate
                    </button>
                  )}

                  {enableMindchange && !editDir && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); (graph as any)?.beginMindchangeOnEdge?.(edgeId); })}
                      className="rounded-lg px-4 py-1.5 text-xs font-semibold bg-white text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50 active:scale-95 transition-all duration-150 border border-gray-200"
                      title="Mindchange"
                    >
                      Mindchange
                    </button>
                  )}

                  {enableMindchange && !editDir && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); onAddObjection(); })}
                      className="rounded-lg px-4 py-1.5 text-xs font-semibold bg-gradient-to-b from-gray-800 to-gray-900 text-white shadow-md hover:shadow-lg hover:from-gray-700 hover:to-gray-800 active:scale-95 transition-all duration-150 border border-gray-700"
                      title="Add mitigation to this relation"
                    >
                      Mitigate
                    </button>
                  )}

                  {enableMindchange && editDir && (
                    <div className="flex items-center gap-3 transition-all duration-200 ease-out">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={value}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            if (Number.isFinite(n)) setValue(Math.max(0, Math.min(100, Math.round(n))));
                          }}
                          className="w-20 border rounded px-2 py-1 text-xs pr-5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-2 text-xs text-gray-500 pointer-events-none">%</span>
                      </div>
                      <button
                        className="relative w-6 h-6 rounded-full overflow-hidden transition-all hover:opacity-80 active:scale-95 bg-white border-2 border-gray-300"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          const options = [10, 50, 100];
                          const currentIndex = options.indexOf(value);
                          const nextIndex = (currentIndex + 1) % options.length;
                          setValue(options[nextIndex]);
                        }}
                        title="Toggle percentage"
                      >
                        <div
                          className={`absolute bottom-0 left-0 right-0 transition-all duration-200 ${isSupportEdge ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' :
                              isNegationEdge ? 'bg-gradient-to-t from-rose-500 to-rose-400' :
                                'bg-gradient-to-t from-blue-500 to-blue-400'
                            }`}
                          style={{ height: `${value}%` }}
                        />
                      </button>
                      <button
                        className="px-3 py-1.5 bg-gradient-to-b from-gray-800 to-gray-900 text-white rounded-lg text-xs font-semibold shadow-md hover:shadow-lg hover:from-gray-700 hover:to-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        onClick={(e) => { e.stopPropagation(); handleSaveMindchange(); }}
                        disabled={isSaving}
                      >
                        {isSaving && (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="px-3 py-1.5 border-2 border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setEditDir(null); try { (graph as any)?.setSelectedEdge?.(null); } catch { }; (graph as any)?.cancelMindchangeSelection?.(); }}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {enableMindchange && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute -left-14 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 border-2 border-gray-200 bg-white shadow-lg flex items-center justify-center text-[11px] font-bold text-gray-700"
                              style={{ pointerEvents: 'auto', position: 'absolute' }}
                            >
                              <span>{(rawBackwardAvg === 0 && getCachedAvg('backward') == null) ? '…' : `${fmtSign(displayBackwardAvg)}%`}</span>
                              {/* arrows removed */}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="z-[70]"><MindchangeBreakdown dir="backward" edgeId={edgeId} /></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute -right-14 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 border-2 border-gray-200 bg-white shadow-lg flex items-center justify-center text-[11px] font-bold text-gray-700"
                              style={{ pointerEvents: 'auto', position: 'absolute' }}
                            >
                              <span>{(rawForwardAvg === 0 && getCachedAvg('forward') == null) ? '…' : `${fmtSign(displayForwardAvg)}%`}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="z-[70]"><MindchangeBreakdown dir="forward" edgeId={edgeId} /></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </div>
              </div>

              {/* Inline input replaces the Mindchange button above; no separate block here */}
            </div>
          </div>
          <ContextMenu
            open={menuOpen}
            x={menuPos.x}
            y={menuPos.y}
            onClose={() => setMenuOpen(false)}
            items={[
              { label: 'Delete edge', danger: true, onClick: () => { try { (graph as any)?.deleteNode?.(edgeId); } catch { } } },
            ]}
          />
        </div>,
        portalTarget
      )}
    </React.Fragment>
  );
};
