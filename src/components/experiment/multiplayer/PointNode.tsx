import React, { useEffect, useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditableNode } from './common/useEditableNode';
import { useAutoFocusNode } from './common/useAutoFocusNode';
import { usePillVisibility } from './common/usePillVisibility';
import { useConnectableNode } from './common/useConnectableNode';
import { ContextMenu } from './common/ContextMenu';
import { toast } from 'sonner';
import { Eye, EyeOff, X as XIcon } from 'lucide-react';
import { NodeActionPill } from './common/NodeActionPill';
import { SideActionPill } from './common/SideActionPill';
import { inversePairEnabled } from '@/config/experiments';
import { useNeighborEmphasis } from './common/useNeighborEmphasis';
import { useHoverTracking } from './common/useHoverTracking';

interface PointNodeProps {
  data: {
    content: string;
    editedBy?: string;
    createdAt?: number;
    closingAnimation?: boolean;

  };
  id: string;
  selected?: boolean;
  parentId?: string;
}

export const PointNode: React.FC<PointNodeProps> = ({ data, id, selected, parentId }) => {
  const { updateNodeContent, updateNodeHidden, updateNodeFavor, addNegationBelow, createSupportBelow, createInversePair, deleteInversePair, isConnectingFromNodeId, deleteNode, startEditingNode, stopEditingNode, getEditorsForNode, isLockedForMe, getLockOwner, proxyMode, beginConnectFromNode, completeConnectToNode, connectMode, selectedEdgeId, hoveredNodeId, setHoveredNodeId, setPairNodeHeight } = useGraphActions() as any;

  const { isEditing, value, contentRef, wrapperRef, onClick, onInput, onKeyDown, onBlur, onFocus, startEditingProgrammatically, onContentMouseDown, onContentMouseMove } = useEditableNode({
    id,
    content: data.content,
    updateNodeContent,
    startEditingNode,
    stopEditingNode,
    isSelected: selected,
  });

  const { hovered, setHovered, onEnter: onHoverEnter, onLeave: onHoverLeave, scheduleHoldRelease, clearHoldTimer } = useHoverTracking(id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sliverHovered, setSliverHovered] = useState(false);
  const [sliverAnimating, setSliverAnimating] = useState(false);
  const [sliverFading, setSliverFading] = useState(false);
  const [animationDistance, setAnimationDistance] = useState(640);
  const [isClosingAnimation, setIsClosingAnimation] = useState(false);

  // Use the reusable hooks
  useAutoFocusNode({
    content: data.content,
    createdAt: data.createdAt,
    isEditing,
    selected,
    startEditingProgrammatically,
    isQuestionNode: false, // Not a question node
  });

  const { pillVisible, handleMouseEnter, handleMouseLeave } = usePillVisibility(200);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const shouldShowPill = pillVisible && !isEditing && !locked;

  const connect = useConnectableNode({ id, locked });
  const hidden = (data as any)?.hidden === true;
  const favor = Math.max(1, Math.min(5, (data as any)?.favor ?? 5));
  const isDirectInverse = Boolean((data as any)?.directInverse);
  const favorOpacity = selected || hovered || sliverHovered || sliverAnimating ? 1 : Math.max(0.3, Math.min(1, favor / 5));

  const isInContainer = !!parentId;
  const isActive = Boolean((selected && !isClosingAnimation) || hovered);
  const closingAnimation = Boolean((data as any)?.closingAnimation);

  useEffect(() => {
    if (closingAnimation && !isClosingAnimation) {
      setIsClosingAnimation(true);

      // Simple fade-out duration
      const animationDuration = 600;

      // End animation
      const t = window.setTimeout(() => {
        setIsClosingAnimation(false);
      }, animationDuration);
      return () => window.clearTimeout(t);
    }
  }, [closingAnimation, isClosingAnimation]);

  // No custom slide-in; rely on existing behaviors only

  // Apply styling for direct connections only
  const innerScaleStyle = useNeighborEmphasis({ id, wrapperRef: wrapperRef as any, isActive, scale: 1.06 });

  // Report measured height to parent group via context (ref-based, no DOM queries elsewhere)
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

  return (
    <>
      <Handle id={`${id}-source-handle`} type="source" position={Position.Top} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <Handle id={`${id}-incoming-handle`} type="target" position={Position.Bottom} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <div className="relative inline-block">
        <div ref={containerRef} className="relative inline-block group">
          {!selected && !isInContainer && inversePairEnabled && (
            <div
              className={`group/sliver absolute left-full top-1/2 translate-y-[calc(-50%+2px)] h-full z-0 pointer-events-auto nodrag nopan ${sliverAnimating ? '' : 'transition-all ease-out'} ${!sliverAnimating ? (sliverHovered ? 'w-[96px] -ml-[48px] duration-700' : (hovered ? 'w-[72px] -ml-[36px] duration-700' : 'w-[30px] -ml-[15px] duration-700')) : ''}`}
              style={sliverAnimating ? {
                width: `${animationDistance}px`,
                marginLeft: '0px', // Keep it anchored to the left, only expand right
                opacity: sliverFading ? 0 : 1,
                transition: `width 1100ms ease-out, opacity ${sliverFading ? '300ms' : '0ms'} ease-out`
              } : {}}
              role="button"
              aria-label={'More'}
              tabIndex={0}
              onMouseDown={(e) => { e.stopPropagation(); }}
              onClick={(e) => {
                e.stopPropagation();

                // Calculate exact distance to where inverse node will spawn
                let calculatedDistance = 400; // fallback (reduced since sliver is smaller)
                try {
                  const currentEl = wrapperRef.current;
                  if (currentEl) {
                    const rect = currentEl.getBoundingClientRect();
                    const nodeWidth = Math.ceil(rect.width);
                    const gapWidth = 25; // Match GroupNode gap between children
                    const padding = 8; // Match GroupNode leftPadding
                    // Exact position where inverse node spawns: padding + nodeWidth + gapWidth
                    calculatedDistance = padding + nodeWidth + gapWidth;
                  }
                } catch { }

                setAnimationDistance(calculatedDistance);
                setSliverAnimating(true);
                setSliverFading(false);

                // Duration based on exact distance (min 600ms, max 1000ms, adjusted for smaller sliver)
                const animationDuration = Math.min(1000, Math.max(600, calculatedDistance * 1.2));

                // Create the inverse pair first, then start fade immediately
                window.setTimeout(() => {
                  createInversePair(id);
                  setSliverFading(true); // Start fade right when node spawns
                }, animationDuration - 300);

                // End animation after fade completes
                window.setTimeout(() => {
                  setSliverAnimating(false);
                  setSliverFading(false);
                }, animationDuration);
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
          )}
          <div
            ref={wrapperRef}
            onMouseEnter={() => { clearHoldTimer(); setHovered(true); onHoverEnter(); handleMouseEnter(); }}
            onMouseLeave={(e) => {
              const next = e.relatedTarget as Node | null;
              const root = (containerRef.current || wrapperRef.current) as any;
              if (root && next && root.contains && root.contains(next)) {
                return;
              }
              scheduleHoldRelease();
              handleMouseLeave();
              onHoverLeave();
              setSliverHovered(false);
            }}
            onMouseDown={(e) => {
              if (isEditing) return;
              // Don't interfere if the mouse is over the content area
              if (contentRef.current && contentRef.current.contains(e.target as Node)) {
                return;
              }
              connect.onMouseDown(e);
            }}
            onMouseUp={(e) => {
              if (isEditing) return;
              // Don't interfere if the mouse is over the content area
              if (contentRef.current && contentRef.current.contains(e.target as Node)) {
                return;
              }
              connect.onMouseUp(e);
            }}
            onClick={(e) => {
              connect.onClick(e as any);
              if (!locked) { onClick(e); } else { e.stopPropagation(); toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); }
            }}
            onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
            data-selected={selected && !isClosingAnimation}
            className={`px-4 py-3 rounded-lg ${hidden ? 'bg-gray-200 text-gray-600' : (isInContainer ? 'bg-white/95 backdrop-blur-sm text-gray-900 shadow-md' : 'bg-white text-gray-900')} border-2 min-w-[200px] max-w-[320px] inline-flex flex-col justify-start align-top relative ${isDirectInverse ? 'z-0' : 'z-10'} ${locked ? 'cursor-not-allowed' : (isEditing ? 'cursor-text' : 'cursor-pointer')} ring-0 transition-transform duration-300 ease-out ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}
            ${hidden ? 'border-gray-300' : ((selected && !isClosingAnimation) ? 'border-black' : 'border-stone-200')}
            `}
            style={{
              opacity: hidden ? undefined : (isClosingAnimation ? 0 : favorOpacity),
              // remove pairHeight-driven minHeight; allow natural height
              // removed fixed height to allow growth when content expands inside containers
              ...innerScaleStyle,
              ...(isClosingAnimation ? {
                transition: 'opacity 600ms ease-out',
                zIndex: 0,
              } : {})
            }}
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute -inset-1 rounded-lg border-4 ${isActive ? 'border-black opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
            />
            <div className="relative z-10">
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
              {selected && isDirectInverse && inversePairEnabled && !isClosingAnimation && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteInversePair?.(id);
                  }}
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
                contentEditable={isEditing && !locked && !hidden}
                suppressContentEditableWarning
                onInput={onInput}
                onMouseDown={onContentMouseDown}
                onMouseMove={onContentMouseMove}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                data-role="content"
                className={`text-sm leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${isEditing ? 'nodrag' : ''} ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 text-gray-900'} ${isInContainer ? 'overflow-visible' : ''}`}
                style={{ userSelect: hidden ? 'none' : 'text' }}
                title={typeof value === 'string' ? value : undefined}
              >
                {value}
              </div>
              {hidden && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <div className="text-sm text-stone-500 italic animate-fade-in">Hidden</div>
                </div>
              )}

              {selected && !hidden && !isClosingAnimation && (
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
              {!hidden && ((data as any)?.type !== 'statement' && (data as any)?.type !== 'title') && (
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
              {null}
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
          { label: 'Delete node', danger: true, onClick: () => { if (locked) { toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); } else { deleteNode(id); } } },
        ]}
      />
    </>
  );
};
