import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { EditorsBadgeRow } from './EditorsBadgeRow';
import { useEditableNode } from './common/useEditableNode';
import { useAutoFocusNode } from './common/useAutoFocusNode';
import { usePillVisibility } from './common/usePillVisibility';
import { useConnectableNode } from './common/useConnectableNode';
import { ContextMenu } from './common/ContextMenu';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { NodeActionPill } from './common/NodeActionPill';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PointNodeProps {
  data: {
    content: string;
    editedBy?: string;
    createdAt?: number;
  };
  id: string;
  selected?: boolean;
}

export const PointNode: React.FC<PointNodeProps> = ({ data, id, selected }) => {
  const { updateNodeContent, updateNodeHidden, updateNodeFavor, addNegationBelow, isConnectingFromNodeId, deleteNode, startEditingNode, stopEditingNode, getEditorsForNode, isLockedForMe, getLockOwner, proxyMode, beginConnectFromNode, completeConnectToNode, connectMode, selectedEdgeId } = useGraphActions() as any;

  const { isEditing, value, contentRef, wrapperRef, onClick, onInput, onKeyDown, onBlur, onFocus, startEditingProgrammatically } = useEditableNode({
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

  // Use the reusable hooks
  useAutoFocusNode({
    content: data.content,
    createdAt: data.createdAt,
    isEditing,
    selected,
    startEditingProgrammatically,
    isQuestionNode: false, // Not a question node
  });

  const { pillVisible, handleMouseEnter, handleMouseLeave } = usePillVisibility();

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const shouldShowPill = pillVisible && !isEditing && !locked;

  const connect = useConnectableNode({ id, locked });
  const hidden = (data as any)?.hidden === true;
  const favor = Math.max(1, Math.min(5, (data as any)?.favor ?? 3));
  const favorOpacity = selected || hovered ? 1 : Math.max(0.3, Math.min(1, favor / 5));

  return (
    <>
      <Handle id={`${id}-source-handle`} type="source" position={Position.Top} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <Handle id={`${id}-incoming-handle`} type="target" position={Position.Bottom} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <div className="relative inline-block">
        <div
          ref={wrapperRef}
          onMouseEnter={() => { setHovered(true); handleMouseEnter(); }}
          onMouseLeave={() => { setHovered(false); handleMouseLeave(); }}
          onMouseDown={connect.onMouseDown}
          onMouseUp={connect.onMouseUp}
          onClick={(e) => {
            connect.onClick(e as any);
            if (!locked) { onClick(e); } else { e.stopPropagation(); toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); }
          }}
          onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
          data-selected={selected}
          className={`px-4 py-3 rounded-lg ${hidden ? 'bg-gray-200 text-gray-600' : 'bg-white text-gray-900'} border-2 min-w-[200px] max-w-[320px] relative z-10 ${locked ? 'cursor-not-allowed' : (isEditing ? 'cursor-text' : 'cursor-pointer')} ring-0
            ${hidden ? 'border-gray-300' : 'border-stone-200'}
            ${isConnectingFromNodeId === id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md' : ''}
            data-[selected=true]:ring-2 data-[selected=true]:ring-black data-[selected=true]:ring-offset-2 data-[selected=true]:ring-offset-white
            `}
          style={{ opacity: hidden ? undefined : favorOpacity }}
        >
          <div className="relative z-10">
            {/* Eye toggle top-right */}
            {selected && (
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
            {isConnectingFromNodeId === id && (
              <div className="absolute -top-3 right-0 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
            )}
            {!proxyMode && lockOwner && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded text-white shadow" style={{ backgroundColor: lockOwner.color }}>
                {lockOwner.name}
              </div>
            )}
            {/* Keep content element for stable height; overlay Hidden label */}
            <div
              ref={contentRef}
              contentEditable={isEditing && !locked && !hidden}
              suppressContentEditableWarning
              onInput={onInput}
              onFocus={onFocus}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              className={`text-sm leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 text-gray-900'}`}
            >
              {value}
            </div>
            {hidden && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <div className="text-sm text-stone-500 italic animate-fade-in">Hidden</div>
              </div>
            )}

            <EditorsBadgeRow editors={getEditorsForNode?.(id) || []} />
            {selected && !hidden && (
              <div className="mt-1 mb-1 flex items-center gap-2 select-none">
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
                onClick={() => addNegationBelow(id)}
                colorClass="bg-stone-800"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            )}
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
