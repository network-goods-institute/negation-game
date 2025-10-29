import React, { useMemo, useRef, useState } from 'react';
import { Position } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { NodeShell } from './common/NodeShell';
import { useNodeChrome } from './common/useNodeChrome';
import { NodeActionPill } from './common/NodeActionPill';
import { usePerformanceMode } from './PerformanceContext';
import { LockIndicator } from './common/LockIndicator';
import { useContextMenuHandler } from './common/useContextMenuHandler';
import { ContextMenu } from './common/ContextMenu';

interface CommentNodeProps {
  data: {
    content: string;
    createdAt?: number;
    hidden?: boolean;
  };
  id: string;
  selected?: boolean;
}

const CommentNode: React.FC<CommentNodeProps> = ({ data, id, selected }) => {
  const {
    updateNodeContent,
    startEditingNode,
    stopEditingNode,
    grabMode,
    isLockedForMe,
    getLockOwner,
    deleteNode,
    openTypeSelector,
  } = useGraphActions() as any;

  const hidden = data.hidden === true;
  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;

  const { editable, innerScaleStyle, isActive, cursorClass } = useNodeChrome({
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
  } = editable;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { perfMode } = usePerformanceMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleContextMenu = useContextMenuHandler({
    isEditing,
    onOpenMenu: (pos) => {
      setMenuPos(pos);
      setMenuOpen(true);
    },
  });

  const wrapperClassName = useMemo(() => {
    const base = hidden ? 'bg-gray-200 text-gray-600 border-gray-300' : 'bg-white text-gray-900 border-emerald-200 shadow-md';
    return `px-4 py-3 rounded-lg min-w-[200px] max-w-[320px] inline-flex flex-col relative transition-transform duration-300 ease-out ${base} ${cursorClass} ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}`;
  }, [cursorClass, isActive, hidden]);

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
      wrapperStyle={{ ...innerScaleStyle }}
      wrapperProps={{
        onContextMenu: handleContextMenu,
      } as any}
      highlightClassName={`pointer-events-none absolute -inset-1 rounded-lg border-4 ${isActive ? 'border-emerald-500 opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
    >
      <LockIndicator locked={locked} lockOwner={lockOwner} />
      <div
        ref={contentRef}
        contentEditable={isEditing && !grabMode && !locked}
        spellCheck={true}
        suppressContentEditableWarning
        onInput={onInput}
        onPaste={onPaste}
        onMouseDown={onContentMouseDown}
        onMouseMove={onContentMouseMove}
        onMouseLeave={onContentMouseLeave}
        onMouseUp={onContentMouseUp}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={`text-sm leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${isEditing ? 'nodrag' : ''} ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 text-gray-900'}`}
        title={typeof value === 'string' ? value : undefined}
        onClick={onClick}
      >
        {value || 'New comment'}
      </div>
      {hidden && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div className="text-sm text-stone-500 italic animate-fade-in">Hidden</div>
        </div>
      )}
      {selected && !hidden && !grabMode && !perfMode && (
        <div className="mt-1 flex items-center">
          <NodeActionPill
            label="Type"
            visible={true}
            onClick={() => { openTypeSelector?.(id); }}
            colorClass="bg-emerald-600"
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
            onForceHide={() => {}}
          />
        </div>
      )}
    </NodeShell>
    <ContextMenu
      open={menuOpen}
      x={menuPos.x}
      y={menuPos.y}
      onClose={() => setMenuOpen(false)}
      items={[
        { label: 'Delete node', danger: true, onClick: () => { if (locked) return; deleteNode?.(id); } },
      ]}
    />
    </>
  );
};

export default CommentNode;
