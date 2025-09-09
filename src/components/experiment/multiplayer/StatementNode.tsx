import React, { useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { useEditableNode } from './common/useEditableNode';
import { usePillVisibility } from './common/usePillVisibility';
import { useConnectableNode } from './common/useConnectableNode';
import { ContextMenu } from './common/ContextMenu';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { NodeActionPill } from './common/NodeActionPill';
import { useNeighborEmphasis } from './common/useNeighborEmphasis';
import { useHoverTracking } from './common/useHoverTracking';

interface StatementNodeProps {
  id: string;
  data: { statement?: string };
  selected?: boolean;
}

export const StatementNode: React.FC<StatementNodeProps> = ({ id, data, selected }) => {
  const { updateNodeContent, updateNodeHidden, updateNodeFavor, addPointBelow, isConnectingFromNodeId, deleteNode, startEditingNode, stopEditingNode, getEditorsForNode, isLockedForMe, getLockOwner, proxyMode, beginConnectFromNode, completeConnectToNode, connectMode } = useGraphActions() as any;
  const content = data?.statement || '';

  const { isEditing, value, contentRef, wrapperRef, onClick, onInput, onKeyDown, onBlur, onFocus, onContentMouseDown, onContentMouseMove } = useEditableNode({
    id,
    content,
    updateNodeContent,
    startEditingNode,
    stopEditingNode,
    isSelected: selected,
  });

  const { hovered, setHovered, onEnter, onLeave } = useHoverTracking(id);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { pillVisible, handleMouseEnter, handleMouseLeave, hideNow } = usePillVisibility();
  const isActive = Boolean(selected || hovered);
  const innerScaleStyle = useNeighborEmphasis({ id, wrapperRef: wrapperRef as any, isActive, scale: 1.06 });

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const shouldShowPill = pillVisible && !isEditing && !locked;
  const connect = useConnectableNode({ id, locked });
  const hidden = (data as any)?.hidden === true;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });


  return (
    <>
      <Handle id={`${id}-source-handle`} type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <Handle id={`${id}-incoming-handle`} type="target" position={Position.Top} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <div
        ref={rootRef}
        className="relative inline-block"
        onMouseEnter={() => { setHovered(true); onEnter(); handleMouseEnter(); }}
        onMouseLeave={(e) => {
          const next = e.relatedTarget as EventTarget | null;
          const root = rootRef.current;
          if (root && next && next instanceof Node && root.contains(next)) return;
          setHovered(false);
          handleMouseLeave();
          onLeave();
        }}
      >
        <div className="relative inline-block">
          <div
            ref={wrapperRef}
            // hover handled on root container to avoid flicker when approaching from bottom
            onMouseDown={(e) => { if (isEditing) return; connect.onMouseDown(e); }}
            onMouseUp={(e) => { if (isEditing) return; connect.onMouseUp(e); }}
            onClick={(e) => {
              connect.onClick(e as any);
              if (!locked) { onClick(e); } else { e.stopPropagation(); toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); }
            }}
            onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
            data-selected={selected}

            className={`px-5 py-3 rounded-xl ${hidden ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-900'} border-2 ${locked ? 'cursor-not-allowed' : (isEditing ? 'cursor-text' : 'cursor-pointer')} min-w-[240px] max-w-[360px] relative z-10 ring-0 transition-transform duration-300 ease-out ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}
            ${hidden ? 'border-blue-300' : 'border-blue-200'}
            ${isConnectingFromNodeId === id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md' : ''}
            data-[selected=true]:ring-2 data-[selected=true]:ring-black data-[selected=true]:ring-offset-2 data-[selected=true]:ring-offset-white
            `}
            style={innerScaleStyle}
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute -inset-1 rounded-xl border-4 ${isActive ? 'border-black opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
            />
            <div className="relative z-10">
              {isConnectingFromNodeId === id && (
                <div className="absolute -top-3 right-0 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
              )}
              {/* Eye toggle */}
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
              {/* Keep content for stable height; overlay Hidden label */}
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
                className={`text-sm font-semibold whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}
                style={{ userSelect: hidden ? 'none' : 'text' }}
              >
                {value || 'New Question'}
              </div>
              {hidden && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <div className="text-sm font-semibold text-stone-600 italic animate-fade-in">Hidden</div>
                </div>
              )}

              {!hidden && (
                <NodeActionPill
                  label="Make option"
                  visible={shouldShowPill}
                  onClick={() => { addPointBelow(id); hideNow(); setHovered(false); }}
                  colorClass="bg-blue-700"
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
