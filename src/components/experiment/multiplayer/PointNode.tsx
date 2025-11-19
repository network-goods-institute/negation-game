import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Position, useReactFlow, useStore } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { toast } from 'sonner';
import { X as XIcon } from 'lucide-react';
import { NodeActionPill } from './common/NodeActionPill';
import { usePerformanceMode } from './PerformanceContext';
import { inversePairEnabled } from '@/config/experiments';
import { useNodeChrome } from './common/useNodeChrome';
import { useFavorOpacity } from './common/useFavorOpacity';
import { NodeShell } from './common/NodeShell';
import { useForceHidePills } from './common/useForceHidePills';
import { FavorSelector } from './common/FavorSelector';
import { useNodeExtrasVisibility } from './common/useNodeExtrasVisibility';
import { LockIndicator } from './common/LockIndicator';
import { isMarketEnabled } from '@/utils/market/marketUtils';
import { ContextMenu } from './common/ContextMenu';
import { useAtomValue } from 'jotai';
import { marketOverlayStateAtom, marketOverlayZoomThresholdAtom, computeSide } from '@/atoms/marketOverlayAtom';
import { useViewport } from '@xyflow/react';

const INTERACTIVE_TARGET_SELECTOR = 'button, [role="button"], a, input, textarea, select, [data-interactive="true"]';

interface PointNodeProps {
  data: {
    content: string;
    editedBy?: string;
    createdAt?: number;
    closingAnimation?: boolean;
    favor?: number;
    directInverse?: boolean;
    hidden?: boolean;
  };
  id: string;
  selected?: boolean;
  parentId?: string;
}

export const PointNode: React.FC<PointNodeProps> = ({ data, id, selected, parentId }) => {
  const rf = useReactFlow();
  const { zoom } = useViewport();
  const state = useAtomValue(marketOverlayStateAtom);
  const threshold = useAtomValue(marketOverlayZoomThresholdAtom);

  const {
    updateNodeContent,
    updateNodeHidden,
    updateNodeFavor,
    addPointBelow,
    createInversePair,
    deleteInversePair,
    isConnectingFromNodeId,
    deleteNode,
    startEditingNode,
    stopEditingNode,
    isLockedForMe,
    getLockOwner,
    setPairNodeHeight,
    grabMode,
  } = useGraphActions() as any;

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const hidden = data.hidden === true;

  let side = computeSide(state);
  if (state === 'AUTO_TEXT' || state === 'AUTO_PRICE') {
    side = zoom <= (threshold ?? 0.6) ? 'PRICE' : 'TEXT';
  }
  const overlayActive = side === 'PRICE';

  const { editable, hover, pill, connect, innerScaleStyle, isActive, cursorClass } = useNodeChrome({
    id,
    selected,
    content: data.content,
    updateNodeContent,
    startEditingNode,
    stopEditingNode,
    locked,
    hidden,
    pillDelay: 200,
    autoFocus: {
      createdAt: data.createdAt,
      isQuestionNode: false,
    },
  });

  const {
    isEditing,
    value,
    contentRef,
    wrapperRef,
    onClick,
    onInput,
    onPaste,
    onKeyDown,
    onBlur,
    onFocus,
    onContentMouseDown,
    onContentMouseMove,
    onContentMouseLeave,
    onContentMouseUp,
    isConnectMode,
  } = editable;

  const {
    hovered,
    onMouseEnter: onHoverEnter,
    onMouseLeave: onHoverLeave,
  } = hover;

  const { handleMouseEnter, handleMouseLeave, shouldShowPill } = pill;

  const forceHidePills = useForceHidePills({
    id,
    hidePill: pill.hideNow,
    onPillMouseLeave: pill.handleMouseLeave,
    onHoverLeave: onHoverLeave,
  });
  const [sliverHovered, setSliverHovered] = useState(false);
  const [sliverAnimating, setSliverAnimating] = useState(false);
  const [sliverFading, setSliverFading] = useState(false);
  const [animationDistance, setAnimationDistance] = useState(640);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const favorValue = data.favor;
  const favor = Math.max(1, Math.min(5, favorValue ?? 5));
  const isDirectInverse = Boolean(data.directInverse);
  const isInContainer = Boolean(parentId);

  const favorOpacity = useFavorOpacity({
    favor,
    selected: !!selected,
    hovered,
    additionalFullOpacityConditions: [sliverHovered, sliverAnimating],
  });

  const extras = useNodeExtrasVisibility({
    id,
    selected: !!selected,
    isEditing,
    isConnectMode,
    contentRef: contentRef as any,
    interactiveSelector: INTERACTIVE_TARGET_SELECTOR,
    wrapperRef: wrapperRef as any,
  });


  useEffect(() => {
    if (!parentId || !wrapperRef?.current || !setPairNodeHeight) return;
    const el = wrapperRef.current as HTMLElement;
    let prev = -1;
    const measure = () => {
      try {
        const h = Math.ceil(el.getBoundingClientRect().height);
        if (Number.isFinite(h) && h > 0 && h !== prev) {
          prev = h;
          setPairNodeHeight(parentId as string, id, h);
        }
      } catch { }
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    try { ro.observe(el); } catch { }
    return () => { try { ro.disconnect(); } catch { } };
  }, [parentId, id, setPairNodeHeight, wrapperRef]);

  const marketEnabled = isMarketEnabled();
  const isNodeDragging = useStore((s: any) => {
    try {
      const fromInternals = s?.nodeInternals?.get?.(id);
      if (fromInternals && typeof fromInternals === 'object') {
        return Boolean((fromInternals as any).dragging);
      }
      const nodesArr = Array.isArray(s.nodes) ? s.nodes : Array.from(s.nodes?.values?.() || []);
      const self = nodesArr.find((n: any) => String(n?.id) === String(id));
      return Boolean(self?.dragging);
    } catch {
      return false;
    }
  });
  const graphCtx = useGraphActions() as any;
  const mindchangeSelectable = useMemo(() => {
    try {
      if (!graphCtx?.mindchangeMode || !graphCtx?.mindchangeEdgeId || graphCtx?.mindchangeNextDir) return false;
      const mcEdge = (rf as any).getEdges?.().find((e: any) => String(e.id) === String(graphCtx.mindchangeEdgeId));
      if (!mcEdge) return false;
      if ((mcEdge as any).type === 'objection') return false;
      return String(mcEdge.source) === id || String(mcEdge.target) === id;
    } catch { return false; }
  }, [graphCtx?.mindchangeMode, graphCtx?.mindchangeEdgeId, graphCtx?.mindchangeNextDir, rf, id]);

  const handleInverseSliverClick = () => {
    let calculatedDistance = 400;
    try {
      const currentEl = wrapperRef.current;
      if (currentEl) {
        const rect = currentEl.getBoundingClientRect();
        const nodeWidth = Math.ceil(rect.width);
        const gapWidth = 25;
        const padding = 8;
        calculatedDistance = padding + nodeWidth + gapWidth;
      }
    } catch { }

    setAnimationDistance(calculatedDistance);
    setSliverAnimating(true);
    setSliverFading(false);

    const animationDuration = Math.min(1000, Math.max(600, calculatedDistance * 1.2));

    window.setTimeout(() => {
      createInversePair(id);
      setSliverFading(true);
    }, animationDuration - 300);

    window.setTimeout(() => {
      setSliverAnimating(false);
      setSliverFading(false);
    }, animationDuration);
  };

  const beforeWrapper = false ? (
    <div
      className={`group/sliver absolute left-full top-1/2 translate-y-[calc(-50%+2px)] h-full z-0 pointer-events-auto nodrag nopan ${sliverAnimating ? '' : 'transition-all ease-out'} ${!sliverAnimating ? (sliverHovered ? 'w-[96px] -ml-[48px] duration-700' : (hovered ? 'w-[72px] -ml-[36px] duration-700' : 'w-[30px] -ml-[15px] duration-700')) : ''}`}
      style={sliverAnimating ? {
        width: `${animationDistance}px`,
        marginLeft: '0px',
        opacity: sliverFading ? 0 : 1,
        transition: `width 1100ms ease-out, opacity ${sliverFading ? '300ms' : '0ms'} ease-out`,
      } : undefined}
      role="button"
      aria-label="More"
      tabIndex={0}
      onMouseDown={(e) => { e.stopPropagation(); }}
      onClick={(e) => {
        e.stopPropagation();
        handleInverseSliverClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); }
      }}
      onDragStart={(e) => { e.preventDefault(); }}
      onMouseEnter={() => { setSliverHovered(true); }}
      onMouseLeave={() => { setSliverHovered(false); }}
    >
      <div
        className={`w-full h-full bg-white border-black border-4 rounded-lg shadow-lg overflow-hidden origin-left transition-all ease-out ${(hovered && !sliverAnimating) ? 'opacity-100 duration-700' : sliverAnimating ? 'opacity-0 duration-1000' : 'opacity-0 duration-700'}`}
        style={{ willChange: 'transform, opacity' }}
      />
    </div>
  ) : undefined;

  const wrapperClassName = useMemo(() => {
    const base = hidden ? 'bg-gray-200 text-gray-600 border-gray-300' : (isInContainer ? 'bg-white/95 backdrop-blur-sm text-gray-900 border-stone-200 shadow-md' : 'bg-white text-gray-900 border-stone-200');
    const ringConnect = isConnectingFromNodeId === id ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white shadow-md' : '';
    const ringMindchange = mindchangeSelectable ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white' : '';
    return `px-4 py-3 rounded-lg min-w-[200px] max-w-[320px] inline-flex flex-col relative origin-center group transition-transform duration-400 ease-out ${base} ${cursorClass} ${ringConnect} ${ringMindchange} ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}`;
  }, [hidden, isInContainer, cursorClass, isConnectingFromNodeId, id, isActive, mindchangeSelectable]);

  const wrapperProps = {
    onMouseEnter: (e) => {
      e.stopPropagation();
      onHoverEnter();
      handleMouseEnter();
    },
    onMouseLeave: (e) => {
      e.stopPropagation();
      onHoverLeave();
      setSliverHovered(false);
      handleMouseLeave();
    },
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      if (isConnectMode) {
        // Allow click to start/finish connect, but prevent drag/selection during connect
        e.stopPropagation();
        return;
      }
      if (isEditing) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_TARGET_SELECTOR)) {
        e.stopPropagation();
        return;
      }
      if (contentRef.current && contentRef.current.contains(e.target as Node)) {
        extras.onWrapperMouseDown(e);
        return;
      }
      extras.onWrapperMouseDown(e);
    },
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      if (isConnectMode) return;
      if (isEditing) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_TARGET_SELECTOR)) return;
      if (contentRef.current && contentRef.current.contains(e.target as Node)) { extras.onWrapperTouchStart(e); return; }
      extras.onWrapperTouchStart(e);
    },
    onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => {
      // Prevent double-click from bubbling up to canvas (which would spawn new nodes)
      e.stopPropagation();
      e.preventDefault();
    },
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      if (isConnectMode) {
        const handled = connect.onClick(e);
        if (handled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      if (contentRef.current && contentRef.current.contains(e.target as Node)) {
        onClick(e);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_TARGET_SELECTOR)) {
        return;
      }
      if (isEditing) return;
      if (locked) {
        e.stopPropagation();
        toast.warning(`Locked by ${lockOwner?.name || 'another user'}`);
        return;
      }
      onClick(e);
    },
    'data-selected': selected,
  } as React.HTMLAttributes<HTMLDivElement>;

  const { perfMode } = usePerformanceMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const onContextMenuNode = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };
  return (
    <>
      <NodeShell
        handles={[
          {
            id: `${id}-source-handle`,
            type: 'source',
            position: Position.Top,
            style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
          },
          {
            id: `${id}-incoming-handle`,
            type: 'target',
            position: Position.Bottom,
            style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
          },
        ]}
        containerRef={containerRef}
        containerClassName="relative inline-block group"
        beforeWrapper={beforeWrapper}
        wrapperRef={wrapperRef}
        wrapperClassName={wrapperClassName}
        wrapperStyle={{
          ...innerScaleStyle,
          opacity: hidden ? undefined : (overlayActive && !selected && !hovered ? 0 : favorOpacity),
        }}
        wrapperProps={{ ...(wrapperProps as any), onContextMenu: onContextMenuNode }}
        highlightClassName={`pointer-events-none absolute -inset-1 rounded-lg border-4 ${isActive ? 'border-black opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
      >
        <LockIndicator locked={locked} lockOwner={lockOwner} />
        {selected && isDirectInverse && inversePairEnabled && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); deleteInversePair?.(id); }}
            className="absolute -top-2 -right-2 bg-white border rounded-full shadow hover:bg-stone-50 transition h-6 w-6 flex items-center justify-center"
            title="Remove inverse pair"
            aria-label="Remove inverse pair"
            style={{ zIndex: 20 }}
          >
            <XIcon size={14} />
          </button>
        )}
        {isConnectingFromNodeId === id && (
          <div className="absolute -top-3 right-0 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
        )}
        <div
          ref={contentRef}
          contentEditable={isEditing && !locked && !hidden && !isConnectMode}
          spellCheck={true}
          suppressContentEditableWarning
          onInput={onInput}
          onPaste={onPaste}
          onMouseDown={(e) => { extras.onContentMouseDown(e); onContentMouseDown(e); }}
          onTouchStart={(e) => { extras.onContentTouchStart(e); }}
          onMouseMove={onContentMouseMove}
          onMouseLeave={onContentMouseLeave}
          onMouseUp={onContentMouseUp}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={`text-sm leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 text-left ${isEditing ? 'nodrag' : ''} ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 text-gray-900'} ${isInContainer ? 'overflow-visible' : ''}`}
        >
          {value || 'New point'}
        </div>
        {hidden && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-sm text-stone-500 italic animate-fade-in">Hidden</div>
          </div>
        )}
        {selected && !hidden && extras.showExtras && !marketEnabled && (
          <div ref={(el) => extras.registerExtras?.(el)} className={`mt-1 mb-1 flex items-center gap-2 select-none`} style={{ position: 'relative', zIndex: 20 }}>
            <span className="text-[10px] uppercase tracking-wide text-stone-500 -translate-y-0.5">Favor</span>
            <FavorSelector
              value={favor}
              onSelect={(level) => updateNodeFavor?.(id, level)}
              activeClassName="text-amber-500"
              inactiveClassName="text-stone-300"
            />
          </div>
        )}
        {!hidden && !perfMode && !grabMode && extras.showExtras && (
          <div ref={(el) => extras.registerExtras?.(el)}>
            <NodeActionPill
              label="Add Point"
              visible={isEditing ? true : (shouldShowPill && extras.showExtras)}
              onClick={() => { if (isConnectMode) return; addPointBelow?.(id); forceHidePills(); }}
              colorClass="bg-stone-900"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onForceHide={forceHidePills}
            />
          </div>
        )}
      </NodeShell>
      <ContextMenu open={menuOpen} x={menuPos.x} y={menuPos.y} onClose={() => setMenuOpen(false)} items={[{ label: "Delete", danger: true, onClick: () => { if (locked) { toast.warning(`Locked by ${lockOwner?.name || "another user"}`); } else { deleteNode?.(id); } } }]} />
    </>
  );
};
