import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Position } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu } from './common/ContextMenu';
import { toast } from 'sonner';
import { Eye, EyeOff, X as XIcon } from 'lucide-react';
import { NodeActionPill } from './common/NodeActionPill';
import { SideActionPill } from './common/SideActionPill';
import { inversePairEnabled } from '@/config/experiments';
import { useNodeChrome } from './common/useNodeChrome';
import { useFavorOpacity } from './common/useFavorOpacity';
import { NodeShell } from './common/NodeShell';

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
  const {
    updateNodeContent,
    updateNodeHidden,
    updateNodeFavor,
    addNegationBelow,
    createSupportBelow,
    createInversePair,
    deleteInversePair,
    isConnectingFromNodeId,
    deleteNode,
    startEditingNode,
    stopEditingNode,
    isLockedForMe,
    getLockOwner,
    setPairNodeHeight,
  } = useGraphActions() as any;

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const hidden = data.hidden === true;

  const { editable, hover, pill, connect, innerScaleStyle, isActive } = useNodeChrome({
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
    onKeyDown,
    onBlur,
    onFocus,
    onContentMouseDown,
    onContentMouseMove,
    isConnectMode,
  } = editable;

  const {
    hovered,
    setHovered,
    onEnter: onHoverEnter,
    onLeave: onHoverLeave,
    scheduleHoldRelease,
    clearHoldTimer,
  } = hover;

  const { handleMouseEnter, handleMouseLeave, shouldShowPill } = pill;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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

  const beforeWrapper = !selected && !isInContainer && inversePairEnabled ? (
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
      onMouseEnter={() => { clearHoldTimer(); setSliverHovered(true); setHovered(true); }}
      onMouseLeave={() => { setSliverHovered(false); scheduleHoldRelease(); }}
    >
      <div
        className={`w-full h-full bg-white border-black border-4 rounded-lg shadow-lg overflow-hidden origin-left transition-all ease-out ${(hovered && !sliverAnimating) ? 'opacity-100 duration-700' : sliverAnimating ? 'opacity-0 duration-1000' : 'opacity-0 duration-700'}`}
        style={{ willChange: 'transform, opacity' }}
      />
    </div>
  ) : undefined;

  const wrapperClassName = useMemo(() => {
    const base = hidden ? 'bg-gray-200 text-gray-600 border-gray-300' : (isInContainer ? 'bg-white/95 backdrop-blur-sm text-gray-900 border-stone-200 shadow-md' : 'bg-white text-gray-900 border-stone-200');
    const cursor = locked ? 'cursor-not-allowed' : (isEditing ? 'cursor-text' : 'cursor-pointer');
    const ring = isConnectingFromNodeId === id ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white shadow-md' : '';
    return `px-4 py-3 rounded-lg min-w-[200px] max-w-[320px] inline-flex flex-col relative transition-transform duration-300 ease-out ${base} ${cursor} ${ring} ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}`;
  }, [hidden, isInContainer, locked, isEditing, isConnectingFromNodeId, id, isActive]);

  const wrapperProps = {
    onMouseEnter: () => { clearHoldTimer(); setHovered(true); onHoverEnter(); handleMouseEnter(); },
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
      const next = e.relatedTarget as Node | null;
      const root = (containerRef.current || wrapperRef.current) as any;
      if (root && next && typeof root.contains === 'function' && next instanceof Node && root.contains(next)) {
        return;
      }
      scheduleHoldRelease();
      handleMouseLeave();
      onHoverLeave();
      setSliverHovered(false);
    },
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      if (isConnectMode) {
        e.stopPropagation();
        return;
      }
      if (isEditing) return;
      if (contentRef.current && contentRef.current.contains(e.target as Node)) {
        return;
      }
    },
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      if (isConnectMode) {
        const handled = connect.onClick(e);
        if (handled) {
          return;
        }
      }
      if (contentRef.current && contentRef.current.contains(e.target as Node)) {
        onClick(e);
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
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); },
    'data-selected': selected,
  } as React.HTMLAttributes<HTMLDivElement>;

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
        wrapperStyle={{ ...innerScaleStyle, opacity: hidden ? undefined : favorOpacity }}
        wrapperProps={wrapperProps as any}
        highlightClassName={`pointer-events-none absolute -inset-1 rounded-lg border-4 ${isActive ? 'border-black opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
      >
        {selected && !isDirectInverse && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.stopPropagation(); updateNodeHidden?.(id, !hidden); }}
            className="group absolute -top-2 -right-2 bg-white border rounded-full shadow hover:bg-stone-50 transition h-5 w-5 flex items-center justify-center"
            title={hidden ? 'Show' : 'Hide'}
            style={{ zIndex: 20 }}
          >
            <Eye className={`transition-opacity duration-150 ${hidden ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'}`} size={14} />
            <EyeOff className={`absolute transition-opacity duration-150 ${hidden ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} size={14} />
          </button>
        )}
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
          suppressContentEditableWarning
          onInput={onInput}
          onMouseDown={onContentMouseDown}
          onMouseMove={onContentMouseMove}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={`text-sm leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${isEditing ? 'nodrag' : ''} ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 text-gray-900'} ${isInContainer ? 'overflow-visible' : ''}`}
          style={{ userSelect: hidden || isConnectMode ? 'none' : 'text' }}
          title={typeof value === 'string' ? value : undefined}
        >
          {value || 'New point'}
        </div>
        {hidden && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-sm text-stone-500 italic animate-fade-in">Hidden</div>
          </div>
        )}
        {selected && !hidden && (
          <div className="mt-1 mb-1 flex items-center gap-2 select-none" style={{ position: 'relative', zIndex: 20 }}>
            <span className="text-[10px] uppercase tracking-wide text-stone-500">Favor</span>
            <TooltipProvider>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Tooltip key={`fv-${i}`}>
                    <TooltipTrigger asChild>
                      <button
                        title={`Set favor to ${i}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => { e.stopPropagation(); updateNodeFavor?.(id, i as any); }}
                        className="text-[12px] leading-none"
                      >
                        <span className={i <= favor ? 'text-amber-500' : 'text-stone-300'}>★</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Favor: {i}/5</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        )}
        {!hidden && (
          <NodeActionPill
            label="Negate"
            visible={shouldShowPill}
            onClick={() => { addNegationBelow(id); setHovered(false); setSliverHovered(false); }}
            colorClass="bg-stone-800"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        )}
        {!hidden && (
          <SideActionPill
            label="Support"
            visible={shouldShowPill}
            onClick={() => { createSupportBelow?.(id); setHovered(false); setSliverHovered(false); }}
            colorClass="bg-stone-700"
            side="left"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        )}
      </NodeShell>
      <ContextMenu
        open={menuOpen}
        x={menuPos.x}
        y={menuPos.y}
        onClose={() => setMenuOpen(false)}
        items={[
          { label: 'Delete node', danger: true, onClick: () => { if (locked) { toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); } else { deleteNode(id); } } },
        ]}
      />
    </>
  );
};