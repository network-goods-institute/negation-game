import React from 'react';
import { EdgeLabelRenderer, useStore, useReactFlow } from '@xyflow/react';
import { createPortal } from 'react-dom';
import { ContextMenu } from './ContextMenu';
import { useGraphActions } from '../GraphContext';
import { usePersistencePointerHandlers } from './usePersistencePointerHandlers';
import { EdgeTypeToggle } from './EdgeTypeToggle';
import { InlinePriceHistory } from '../market/InlinePriceHistory';
import { useAtomValue } from 'jotai';
import { marketOverlayStateAtom, marketOverlayZoomThresholdAtom, computeSide } from '@/atoms/marketOverlayAtom';
import { isMarketEnabled } from '@/utils/market/marketUtils';
import { logger } from '@/lib/logger';

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

  const overlayState = useAtomValue(marketOverlayStateAtom);
  const threshold = useAtomValue(marketOverlayZoomThresholdAtom);
  const marketEnabled = isMarketEnabled();
  const side = React.useMemo(() => {
    if (!marketEnabled) return 'TEXT';
    let s = computeSide(overlayState);
    if (overlayState === 'AUTO_TEXT' || overlayState === 'AUTO_PRICE') {
      s = zoom <= (threshold ?? 0.6) ? 'PRICE' : 'TEXT';
    }
    return s;
  }, [overlayState, zoom, threshold, marketEnabled]);
  // Edge overlay price circle ALWAYS shows when market is enabled (toolbar state doesn't affect it)
  const showPriceCircle = marketEnabled;
  const showRelevanceStars = !marketEnabled || side === 'TEXT';
  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const anchorNodeId = `anchor:${edgeId}`;

  const anchorNode = useStore((s: any) => s.nodeInternals?.get?.(anchorNodeId));
  const baseX = typeof anchorNode?.position?.x === 'number' ? anchorNode.position.x : cx;
  const baseY = typeof anchorNode?.position?.y === 'number' ? anchorNode.position.y : cy;

  const fallbackScreenLeft = tx + baseX * zoom;
  const fallbackScreenTop = ty + baseY * zoom;

  const [anchorScreenPos, setAnchorScreenPos] = React.useState<{ x: number; y: number } | null>(null);
  const anchorMissesRef = React.useRef(0);
  const updateAnchorScreenPos = React.useCallback(() => {
    if (typeof document === 'undefined') return false;
    try {
      const escapedId = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') ? CSS.escape(String(edgeId)) : String(edgeId);
      const labelEl = document.querySelector(`[data-anchor-edge-id="${escapedId}"]`) as HTMLElement | null;
      const anchorEl = document.querySelector(`[data-id="${anchorNodeId}"]`) as HTMLElement | null;
      const getValidRect = (node: HTMLElement | null) => {
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return null;
        if (rect.width === 0 && rect.height === 0) return null;
        return rect;
      };
      const labelRect = getValidRect(labelEl);
      const anchorRect = getValidRect(anchorEl);
      const rect = labelRect || anchorRect;
      if (rect) {
        anchorMissesRef.current = 0;
        const next = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        setAnchorScreenPos((prev) => {
          if (!prev || prev.x !== next.x || prev.y !== next.y) return next;
          return prev;
        });
        return true;
      }
      anchorMissesRef.current += 1;
      if (anchorMissesRef.current === 3) {
        logger.warn('[edge/overlay] anchor rect missing', {
          edgeId,
          edgeType,
          anchorNodeId,
          labelEl: Boolean(labelEl),
          anchorEl: Boolean(anchorEl),
          zoom,
          tx,
          ty,
        });
      }
      // fallback to transform-based position so HUD still renders
      setAnchorScreenPos((prev) => {
        if (prev && prev.x === fallbackScreenLeft && prev.y === fallbackScreenTop) return prev;
        return { x: fallbackScreenLeft, y: fallbackScreenTop };
      });
    } catch { }
    return false;
  }, [edgeId, anchorNodeId, fallbackScreenLeft, fallbackScreenTop, edgeType, tx, ty, zoom]);

  React.useEffect(() => {
    setAnchorScreenPos(null);
  }, [edgeId, anchorNodeId]);

  React.useLayoutEffect(() => {
    let frame: number | null = null;
    const startedAt = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
    const tick = () => {
      const found = updateAnchorScreenPos();
      const now = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
      if (!found && (now - startedAt < 2000)) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      if (frame != null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [updateAnchorScreenPos, tx, ty, zoom]);

  React.useLayoutEffect(() => {
    updateAnchorScreenPos();
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf: number | null = null;
    const blockGesture = (e: Event) => {
      try { e.preventDefault(); } catch { }
    };
    const handleResize = () => {
      if (raf != null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        updateAnchorScreenPos();
      });
    };
    window.addEventListener('gesturestart', blockGesture as any, { passive: false } as any);
    window.addEventListener('gesturechange', blockGesture as any, { passive: false } as any);
    window.addEventListener('gestureend', blockGesture as any, { passive: false } as any);
    window.addEventListener('resize', handleResize);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      window.removeEventListener('gesturestart', blockGesture as any);
      window.removeEventListener('gesturechange', blockGesture as any);
      window.removeEventListener('gestureend', blockGesture as any);
      window.removeEventListener('resize', handleResize);
    };
  }, [updateAnchorScreenPos]);

  const portalContainerRef = React.useRef<HTMLDivElement | null>(null);
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

  const showHUD = Boolean(overlayOpen) && !suppress && !grabMode;

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
    if (suppress) { setOverlayOpen(false); return; }
    if (selected) { setOverlayOpen(true); try { setOverlayActive?.(edgeId); } catch { }; return; }
    if (isHovered) { setOverlayOpen(true); try { setOverlayActive?.(edgeId); } catch { }; return; }
    if (anchorHover) { setOverlayOpen(true); try { setOverlayActive?.(edgeId); } catch { }; return; }
    if (!isNearOverlay) setOverlayOpen(false);
  }, [selected, isHovered, anchorHover, isNearOverlay, graph, edgeId, suppress, setOverlayActive]);

  // Prevent browser page zoom (Ctrl/⌘ + wheel) while interacting with the overlay/buy UI
  React.useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if ((overlayOpen || isNearOverlay || anchorHover) && (e.ctrlKey || (e as any).metaKey)) {
        try { e.preventDefault(); } catch { }
      }
    };
    window.addEventListener('wheel', onWheel, { capture: true, passive: false } as any);
    return () => window.removeEventListener('wheel', onWheel as any, { capture: true } as any);
  }, [overlayOpen, isNearOverlay, anchorHover]);


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
                  {(edgeType === "support" || edgeType === "negation") && onToggleEdgeType && (
                    <EdgeTypeToggle
                      edgeType={edgeType}
                      onToggle={onToggleEdgeType}
                      onMouseEnter={() => setIsNearOverlay(true)}
                      onMouseLeave={() => setIsNearOverlay(false)}
                    />
                  )}

                  {showRelevanceStars && (() => {
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


                  {/* Buy circle – hover shows price history, click opens full market panel */}
                  {showPriceCircle && (() => {
                    const rawPrice = Number(marketPrice as number);
                    const priceNum = Number.isFinite(rawPrice) ? rawPrice : 0.5;
                    const size = 24;
                    const t = (edgeType || '').toLowerCase();
                    const isSupport = t === 'support';
                    const isNegation = t === 'negation';
                    const isObjection = t === 'objection';
                    if (!(isSupport || isNegation || isObjection)) return null;
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
                        className="relative ml-2"
                        onMouseEnter={() => setHoverBuy(true)}
                        onMouseLeave={() => setHoverBuy(false)}
                        style={{ pointerEvents: 'auto' }}
                      >
                        <button
                          type="button"
                          aria-label="Buy"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => {
                            e.stopPropagation();
                            try { (graph as any)?.clearNodeSelection?.(); } catch { }
                            try { (graph as any)?.setSelectedEdge?.(edgeId); } catch { }
                          }}
                          className="h-7 w-7 rounded-full bg-white border border-stone-200 shadow-none transition flex items-center justify-center hover:shadow-sm hover:border-stone-300 cursor-pointer"
                        >
                          <svg width={size} height={size}>
                            <defs><clipPath id={`edge-mini-clip-inline-${edgeId}`}><circle cx={size / 2} cy={size / 2} r={(size / 2) - 2} /></clipPath></defs>
                            {/* Thin white frame so inner circle is big */}
                            <circle cx={size / 2} cy={size / 2} r={(size / 2) - 0.5} fill="white" stroke="white" strokeWidth={2} />
                            {/* Inner circle background */}
                            <circle cx={size / 2} cy={size / 2} r={(size / 2) - 2} fill="#ffffff" stroke="#e5e7eb" strokeWidth={0.5} />
                            {fill()}
                            <circle cx={size / 2} cy={size / 2} r={(size / 2) - 2} fill="none" stroke="#334155" strokeOpacity={0.15} strokeWidth={0.5} />
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

                  {
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
                  }



                </div>
              </div>
            </div>
          </div>

          <ContextMenu
            open={menuOpen}
            x={menuPos.x}
            y={menuPos.y}
            onClose={() => setMenuOpen(false)}
            items={[
              {
                label: 'Delete Edge',
                onClick: () => { try { (graph as any)?.deleteNode?.(edgeId); } catch { } },
                danger: true,
              },
            ]}
          />
        </div>,
        portalTarget
      )}
    </React.Fragment>
  );
};

