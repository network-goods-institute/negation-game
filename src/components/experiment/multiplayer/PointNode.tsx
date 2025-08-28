import React, { useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { EditorsBadgeRow } from './EditorsBadgeRow';
import { useEditableNode } from './common/useEditableNode';
import { useConnectableNode } from './common/useConnectableNode';
import { ContextMenu } from './common/ContextMenu';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { NodeActionPill } from './common/NodeActionPill';

interface PointNodeProps {
  data: {
    content: string;
    editedBy?: string;
  };
  id: string;
  selected?: boolean;
}

export const PointNode: React.FC<PointNodeProps> = ({ data, id, selected }) => {
  const { updateNodeContent, updateNodeHidden, addNegationBelow, isConnectingFromNodeId, deleteNode, startEditingNode, stopEditingNode, getEditorsForNode, isLockedForMe, getLockOwner, proxyMode, beginConnectFromNode, completeConnectToNode, connectMode } = useGraphActions();

  const { isEditing, value, contentRef, wrapperRef, onClick, onInput, onKeyDown, onBlur, onFocus } = useEditableNode({
    id,
    content: data.content,
    updateNodeContent,
    startEditingNode,
    stopEditingNode,
    isSelected: selected,
  });

  const [hovered, setHovered] = useState(false);
  const [pillVisible, setPillVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  const scheduleHide = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setPillVisible(false);
    }, 180);
  };

  const cancelHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const shouldShowPill = pillVisible && !isEditing && !locked;

  const connect = useConnectableNode({ id, locked });
  const hidden = (data as any)?.hidden === true;

  return (
    <>
      <Handle id={`${id}-source-handle`} type="source" position={Position.Top} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <Handle id={`${id}-incoming-handle`} type="target" position={Position.Bottom} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <div className="relative inline-block">
        {selected && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 blur-xl"
            style={{
              width: '185%',
              height: '135%',
              background:
                'radial-gradient(60% 80% at 50% 52%, rgba(251,191,36,0.46), rgba(251,191,36,0) 72%)',
              zIndex: 0,
            }}
          />
        )}
        <div
          ref={wrapperRef}
          onMouseEnter={() => { setHovered(true); cancelHide(); setPillVisible(true); }}
          onMouseLeave={() => { setHovered(false); scheduleHide(); }}
          onMouseDown={connect.onMouseDown}
          onMouseUp={connect.onMouseUp}
          onClick={(e) => {
            connect.onClick(e as any);
            if (!locked) { onClick(e); } else { e.stopPropagation(); toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); }
          }}
          onContextMenu={(e) => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); setMenuOpen(true); }}
          className={`px-4 py-3 rounded-lg ${hidden ? 'bg-stone-200 border-stone-300 text-stone-600' : 'bg-white border-stone-200'} border-2 min-w-[200px] max-w-[320px] relative z-10 ${locked ? 'cursor-not-allowed' : (isEditing ? 'cursor-text' : 'cursor-pointer')} ${isConnectingFromNodeId === id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md' : ''
            }`}
        >
          <div className="relative z-10">
            {/* Eye toggle top-right */}
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
            {isConnectingFromNodeId === id && (
              <div className="absolute -top-3 right-0 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
            )}
            {!proxyMode && lockOwner && (
              <div className="absolute -top-6 left-0 text-xs px-2 py-1 rounded text-white" style={{ backgroundColor: lockOwner.color }}>
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
        {!hidden && (
          <NodeActionPill
            label="Negate"
            visible={shouldShowPill}
            onClick={() => addNegationBelow(id)}
            colorClass="bg-stone-800"
            onMouseEnter={() => { cancelHide(); setPillVisible(true); }}
            onMouseLeave={() => { scheduleHide(); }}
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
