import React from 'react';
import { EdgeLabelRenderer, useStore } from '@xyflow/react';
import { createPortal } from 'react-dom';
import { ContextMenu } from "../common/ContextMenu";
import { useGraphActions } from '../GraphContext';
import { usePersistencePointerHandlers } from './usePersistencePointerHandlers';
import { EdgeRelevanceStars } from './EdgeRelevanceStars';
import { EdgeTypeToggle } from './EdgeTypeToggle';
import { MindchangeEditor } from './MindchangeEditor';
import { MindchangeIndicators } from './MindchangeIndicators';
import { breakdownCache } from './MindchangeBreakdown';

const EDGE_ANCHOR_SIZE = 36;
const PERSISTENCE_PADDING = 14;
const PERSISTENCE_PADDING_HORIZONTAL = 60;

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
  mindchange,
}) => {
  const [overlayOpen, setOverlayOpen] = React.useState<boolean>(Boolean(selected));
  const [anchorHover, setAnchorHover] = React.useState<boolean>(false);
  const [isNearOverlay, setIsNearOverlay] = React.useState<boolean>(false);
  const { grabMode = false, connectMode = false } = useGraphActions();
  const graph = useGraphActions();
  const enableMindchange = typeof process !== 'undefined' && ["true", "1", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_ENABLE_MINDCHANGE || '').toLowerCase());

  const [tx, ty, zoom] = useStore((s: any) => s.transform);
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

  const portalContainerRef = React.useRef<HTMLDivElement | null>(null);

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

  const {
    handlePersistencePointerDown,
    handlePersistencePointerMove,
    handlePersistencePointerUp,
    handlePersistencePointerLeave,
  } = usePersistencePointerHandlers({ grabMode });

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

  React.useEffect(() => {
    const el = portalContainerRef.current;
    if (!el) return;

    const handleWheel = (event: WheelEvent) => {
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

  const getCachedAvg = (dir: 'forward' | 'backward') => {
    const key = `${edgeId}:${dir}`;
    const cached = breakdownCache.get(key);
    if (!cached || !cached.data || cached.data.length === 0) return null;
    const sum = cached.data.reduce((a, b) => a + (Number(b.value) || 0), 0);
    return Math.round(sum / cached.data.length);
  };
  const displayForwardAvg = rawForwardAvg === 0 ? (getCachedAvg('forward') ?? 0) : rawForwardAvg;
  const displayBackwardAvg = rawBackwardAvg === 0 ? (getCachedAvg('backward') ?? 0) : rawBackwardAvg;

  const [, setCacheTick] = React.useState(0);

  const prefetchBreakdowns = React.useCallback(async () => {
    if (!graph.getMindchangeBreakdown) return;
    const now = Date.now();
    const fKey = `${edgeId}:forward`;
    const bKey = `${edgeId}:backward`;
    const fFresh = (() => { const c = breakdownCache.get(fKey); return !!c && (now - c.ts) < 30000; })();
    const bFresh = (() => { const c = breakdownCache.get(bKey); return !!c && (now - c.ts) < 30000; })();
    if (fFresh && bFresh) return;
    try {
      const res = await graph.getMindchangeBreakdown(edgeId);
      const ts = Date.now();
      if (!fFresh) breakdownCache.set(fKey, { ts, data: res.forward });
      if (!bFresh) breakdownCache.set(bKey, { ts, data: res.backward });
    } catch { }
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
    if (edgeType !== 'negation' && edgeType !== 'objection') return;
    if (selected && activeEdgeId === edgeId && nextDir) {
      setEditDir(nextDir);
    }
  }, [selected, edgeId, graph, edgeType]);

  React.useEffect(() => {
    const isMindchange = Boolean((graph as any)?.mindchangeMode);
    if (!isMindchange && editDir) {
      setEditDir(null);
    }
  }, [graph, editDir]);

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
          }}
          onMouseLeave={() => { onMouseLeave(); setAnchorHover(false); }}
        />
      </EdgeLabelRenderer>

      {portalTarget && showHUD && createPortal(
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
          <div style={{ transformOrigin: 'center', pointerEvents: 'none' }}>
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
                >
                  {(edgeType === "support" || edgeType === "negation") && onToggleEdgeType && !editDir && (
                    <EdgeTypeToggle
                      edgeType={edgeType}
                      onToggle={onToggleEdgeType}
                      onMouseEnter={() => setIsNearOverlay(true)}
                      onMouseLeave={() => setIsNearOverlay(false)}
                    />
                  )}

                  {!enableMindchange && (edgeType === "support" || edgeType === "negation") && !editDir && (
                    <EdgeRelevanceStars
                      relevance={relevance}
                      edgeType={edgeType}
                      starColor={starColor}
                      onUpdateRelevance={onUpdateRelevance}
                      onConnectionAwareClick={handleConnectionAwareClick}
                    />
                  )}

                  {(edgeType !== "support" && edgeType !== "negation") && !enableMindchange && (
                    <EdgeRelevanceStars
                      relevance={relevance}
                      edgeType={edgeType}
                      starColor={starColor}
                      onUpdateRelevance={onUpdateRelevance}
                      onConnectionAwareClick={handleConnectionAwareClick}
                    />
                  )}

                  {enableMindchange && (edgeType === 'negation' || edgeType === 'objection') && !editDir && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleConnectionAwareClick(e, () => { e.stopPropagation(); (graph as any)?.beginMindchangeOnEdge?.(edgeId); })}
                      className="rounded-lg px-4 py-1.5 text-xs font-semibold bg-white text-gray-700 shadow-md hover:shadow-lg hover:bg-gray-50 active:scale-95 transition-all duration-150 border border-gray-200"
                      title="Mindchange"
                    >
                      Mindchange
                    </button>
                  )}

                  {!editDir && (
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

                  {enableMindchange && editDir && (
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
                    />
                  )}

                  {enableMindchange && (edgeType === 'negation' || edgeType === 'objection') && (
                    <MindchangeIndicators
                      edgeId={edgeId}
                      edgeType={edgeType}
                      mindchange={mindchange}
                    />
                  )}
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
              { label: 'Delete edge', danger: true, onClick: () => { try { (graph as any)?.deleteNode?.(edgeId); } catch { } } },
            ]}
          />
        </div>,
        portalTarget
      )}
    </React.Fragment>
  );
};
