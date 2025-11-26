import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Position, useReactFlow, useViewport } from '@xyflow/react';
import { useAtomValue } from 'jotai';
import { marketOverlayStateAtom, marketOverlayZoomThresholdAtom, computeSide } from '@/atoms/marketOverlayAtom';
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
import { useSelectionPayload } from './common/useSelectionPayload';
import { useNodeExtrasVisibility } from './common/useNodeExtrasVisibility';
import { LockIndicator } from './common/LockIndicator';
import { usePillHandlers } from './common/usePillHandlers';

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
  const graphCtx = useGraphActions() as any;
  const {
    updateNodeContent,
    updateNodeFavor,
    addPointBelow,
    createInversePair,
    deleteInversePair,
    isConnectingFromNodeId,
    startEditingNode,
    stopEditingNode,
    isLockedForMe,
    getLockOwner,
    setPairNodeHeight,
    grabMode,
  } = graphCtx;

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const hidden = data.hidden === true;
  const { zoom } = useViewport();
  const overlayState = useAtomValue(marketOverlayStateAtom);
  const overlayThreshold = useAtomValue(marketOverlayZoomThresholdAtom);
  const overlaySide = useMemo(() => {
    let side = computeSide(overlayState);
    if (overlayState === 'AUTO_TEXT' || overlayState === 'AUTO_PRICE') {
      side = zoom <= (overlayThreshold ?? 0.6) ? 'PRICE' : 'TEXT';
    }
    return side;
  }, [overlayState, overlayThreshold, zoom]);
  const overlayActive = overlaySide === 'PRICE';

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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const favor = Math.max(1, Math.min(5, data.favor ?? 5));
  const isDirectInverse = Boolean(data.directInverse);
  const isInContainer = Boolean(parentId);

  const favorOpacity = useFavorOpacity({
    favor,
    selected: !!selected,
    hovered,
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

  const rf = useReactFlow();
  const mindchangeSelectable = useMemo(() => {
    try {
      if (!graphCtx?.mindchangeMode || !graphCtx?.mindchangeEdgeId || graphCtx?.mindchangeNextDir) return false;
      const mcEdge = (rf as any).getEdges?.().find((e: any) => String(e.id) === String(graphCtx.mindchangeEdgeId));
      if (!mcEdge) return false;
      if ((mcEdge as any).type === 'objection') return false;
      return String(mcEdge.source) === id || String(mcEdge.target) === id;
    } catch { return false; }
  }, [graphCtx?.mindchangeMode, graphCtx?.mindchangeEdgeId, graphCtx?.mindchangeNextDir, rf, id]);

  const getSelectedPointNodes = useCallback(() => {
    try {
      return rf.getNodes().filter((n: any) => n?.selected && (n.type === 'point' || n.type === 'objection'));
    } catch {
      return [];
    }
  }, [rf]);

  const buildSelectionPayload = useSelectionPayload(id, getSelectedPointNodes);
  const { handlePillMouseDown, handlePillClick } = usePillHandlers(
    isConnectMode,
    buildSelectionPayload,
    addPointBelow,
    forceHidePills
  );

  const wrapperClassName = useMemo(() => {
    const base = hidden ? 'bg-gray-200 text-gray-600 border-gray-300' : (isInContainer ? 'bg-white/95 backdrop-blur-sm text-gray-900 border-stone-200 shadow-md' : 'bg-white text-gray-900 border-stone-200');
    const ringConnect = isConnectingFromNodeId === id ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white shadow-md' : '';
    const ringMindchange = mindchangeSelectable ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white' : '';
    return `px-4 py-3 rounded-lg min-w-[200px] max-w-[320px] inline-flex flex-col relative transition-all duration-300 ease-out origin-center group ${base} ${cursorClass} ${ringConnect} ${ringMindchange} ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}`;
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
        wrapperRef={wrapperRef}
        wrapperClassName={wrapperClassName}
        wrapperStyle={{
          ...innerScaleStyle,
          opacity: hidden
            ? undefined
            : (overlayActive && !selected && !hovered && !isEditing ? 0 : favorOpacity),
        }}
        wrapperProps={wrapperProps as any}
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
          title={typeof value === 'string' ? value : undefined}
        >
          {value || 'New point'}
        </div>
        {hidden && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-sm text-stone-500 italic animate-fade-in">Hidden</div>
          </div>
        )}
        {selected && !hidden && extras.showExtras && (
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
              onMouseDown={handlePillMouseDown}
              onClick={handlePillClick}
              colorClass="bg-stone-900"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onForceHide={forceHidePills}
            />
          </div>
        )}
      </NodeShell>
    </>
  );
};
