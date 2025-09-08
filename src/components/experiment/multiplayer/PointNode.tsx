import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
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
import { inversePairEnabled } from '@/config/experiments';

interface PointNodeProps {
  data: {
    content: string;
    editedBy?: string;
    createdAt?: number;
  };
  id: string;
  selected?: boolean;
  parentId?: string;
}

export const PointNode: React.FC<PointNodeProps> = ({ data, id, selected, parentId }) => {
  const { updateNodeContent, updateNodeHidden, updateNodeFavor, addNegationBelow, createInversePair, deleteInversePair, isConnectingFromNodeId, deleteNode, startEditingNode, stopEditingNode, getEditorsForNode, isLockedForMe, getLockOwner, proxyMode, beginConnectFromNode, completeConnectToNode, connectMode, selectedEdgeId } = useGraphActions() as any;

  const { isEditing, value, contentRef, wrapperRef, onClick, onInput, onKeyDown, onBlur, onFocus, startEditingProgrammatically, onContentMouseDown, onContentMouseMove } = useEditableNode({
    id,
    content: data.content,
    updateNodeContent,
    startEditingNode,
    stopEditingNode,
    isSelected: selected,
  });

  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sliverHovered, setSliverHovered] = useState(false);
  const holdTimerRef = React.useRef<number | null>(null);
  const clearHoldTimer = React.useCallback(() => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);
  const scheduleOpacityHoldRelease = React.useCallback(() => {
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      setHovered(false);
      setSliverHovered(false);
      holdTimerRef.current = null;
    }, 100);
  }, [clearHoldTimer]);
  const [sliverAnimating, setSliverAnimating] = useState(false);

  // Use the reusable hooks
  useAutoFocusNode({
    content: data.content,
    createdAt: data.createdAt,
    isEditing,
    selected,
    startEditingProgrammatically,
    isQuestionNode: false, // Not a question node
  });

  const { pillVisible, handleMouseEnter, handleMouseLeave, hideNow } = usePillVisibility();

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const shouldShowPill = pillVisible && !isEditing && !locked;

  const connect = useConnectableNode({ id, locked });
  const hidden = (data as any)?.hidden === true;
  const favor = Math.max(1, Math.min(5, (data as any)?.favor ?? 5));
  const isDirectInverse = Boolean((data as any)?.directInverse);
  const favorOpacity = selected || hovered || sliverHovered || sliverAnimating ? 1 : Math.max(0.3, Math.min(1, favor / 5));

  const isInContainer = !!parentId;
  const isActive = Boolean(selected || hovered);

  return (
    <>
      <Handle id={`${id}-source-handle`} type="source" position={Position.Top} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <Handle id={`${id}-incoming-handle`} type="target" position={Position.Bottom} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <div className="relative inline-block">
        <div className="relative inline-block group">
          {/* Hover sliver: empty card edge appearing from behind (hidden when selected or in container) */}
          {!selected && !isInContainer && inversePairEnabled && (
            <div
              className={`group/sliver absolute left-full top-1/2 translate-y-[calc(-50%+2px)] h-full z-0 pointer-events-auto nodrag nopan transition-all duration-700 ease-out ${sliverHovered ? 'w-[64px] -ml-[32px]' : (hovered ? 'w-[48px] -ml-[24px]' : 'w-[36px] -ml-[18px]')}`}
              role="button"
              aria-label={'More'}
              tabIndex={0}
              onMouseDown={(e) => { e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); createInversePair(id); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); }
              }}
              onDragStart={(e) => { e.preventDefault(); }}
              onMouseEnter={() => { clearHoldTimer(); setSliverHovered(true); setHovered(true); }}
              onMouseLeave={() => { setSliverHovered(false); scheduleOpacityHoldRelease(); }}
            >
              <div
                className={`w-full h-full bg-white border-2 border-stone-200 rounded-lg shadow-lg overflow-hidden origin-left transition-opacity duration-700 ease-out ${hovered ? 'opacity-100' : 'opacity-0'}`}
                style={{ willChange: 'transform, opacity' }}
              />
            </div>
          )}
          <div
            ref={wrapperRef}
            onMouseEnter={() => { clearHoldTimer(); setHovered(true); handleMouseEnter(); }}
            onMouseLeave={() => { scheduleOpacityHoldRelease(); handleMouseLeave(); }}
            onMouseDown={(e) => { if (isEditing) return; connect.onMouseDown(e); }}
            onMouseUp={(e) => { if (isEditing) return; connect.onMouseUp(e); }}
            onClick={(e) => {
              connect.onClick(e as any);
              if (!locked) { onClick(e); } else { e.stopPropagation(); toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); }
            }}
            onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
            data-selected={selected}

            className={`px-4 py-3 rounded-lg ${hidden ? 'bg-gray-200 text-gray-600' : (isInContainer ? 'bg-white/95 backdrop-blur-sm text-gray-900 shadow-md' : 'bg-white text-gray-900')} border-2 min-w-[200px] max-w-[320px] relative z-10 ${locked ? 'cursor-not-allowed' : (isEditing ? 'cursor-text' : 'cursor-pointer')} ring-0 transition-transform duration-300 ease-out ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}
            ${hidden ? 'border-gray-300' : (selected ? 'border-black' : 'border-stone-200')}
            `}
            style={{ opacity: hidden ? undefined : favorOpacity }}
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute -inset-1 rounded-lg border-4 ${isActive ? 'border-black opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
            />
            <div className="relative z-10">
              {/* Eye toggle top-right */}
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
              {/* Keep content element for stable height; overlay Hidden label */}
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
                className={`text-sm leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 text-gray-900'} ${isInContainer ? 'overflow-auto' : ''}`}
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
                  onClick={() => { addNegationBelow(id); hideNow(); setHovered(false); setSliverHovered(false); }}
                  colorClass="bg-stone-800"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
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
          { label: 'Delete node', danger: true, onClick: () => { if (locked) { toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); } else { deleteNode(id); } } },
        ]}
      />
    </>
  );
};
