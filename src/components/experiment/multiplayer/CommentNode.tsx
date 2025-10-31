import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Position } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { ContextMenu } from './common/ContextMenu';
import { NodeActionPill } from './common/NodeActionPill';
import { toast } from 'sonner';
import { useNodeChrome } from './common/useNodeChrome';
import { useNodeExtrasVisibility } from './common/useNodeExtrasVisibility';
import { NodeShell } from './common/NodeShell';
import { useContextMenuHandler } from './common/useContextMenuHandler';
import { LockIndicator } from './common/LockIndicator';
import { useForceHidePills } from './common/useForceHidePills';

const INTERACTIVE_TARGET_SELECTOR = 'button, [role="button"], a, input, textarea, select, [data-interactive="true"]';

interface CommentNodeProps {
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

export const CommentNode: React.FC<CommentNodeProps> = ({ data, id, selected, parentId }) => {
  const {
    updateNodeContent,
    isConnectingFromNodeId,
    deleteNode,
    startEditingNode,
    stopEditingNode,
    isLockedForMe,
    getLockOwner,
    setPairNodeHeight,
    addPointBelow,
    addNodeAtPosition,
    grabMode,
    setEdges,
    updateNodeType,
  } = useGraphActions() as any;

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const hidden = data.hidden === true;

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
    onMouseEnter: onHoverEnter,
    onMouseLeave: onHoverLeave,
  } = hover;

  const { handleMouseEnter, handleMouseLeave, shouldShowPill } = pill;

  const forceHidePills = useForceHidePills({
    id,
    hidePill: pill.hideNow,
    onPillMouseLeave: pill.handleMouseLeave,
    onHoverLeave: hover.onMouseLeave,
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

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleContextMenu = useContextMenuHandler({
    isEditing,
    onOpenMenu: (pos) => {
      setMenuPos(pos);
      setMenuOpen(true);
    },
  });

  const handleReply = () => {
    if (isConnectMode || locked) return;

    const result = addPointBelow?.(id);
    if (!result) return;

    const newNodeId = typeof result === 'string' ? result : result.nodeId;
    if (newNodeId && updateNodeType) {
      updateNodeType(newNodeId, 'comment');
    }

    startEditingNode?.(newNodeId);
  };
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInContainer = Boolean(parentId);


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

  const wrapperClassName = useMemo(() => {
    const base = hidden
      ? 'bg-gray-200 text-gray-600 border-gray-300'
      : (isInContainer
        ? 'bg-yellow-50 backdrop-blur-sm text-gray-900 border-yellow-200 shadow-lg'
        : 'bg-yellow-50 text-gray-900 border-yellow-200 shadow-lg');
    const ring = isConnectingFromNodeId === id ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white shadow-md' : '';
    return `px-4 py-3 rounded-lg min-w-[200px] max-w-[320px] inline-flex flex-col relative transition-all duration-300 ease-out origin-center ${base} ${cursorClass} ${ring} ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}`;
  }, [hidden, isInContainer, cursorClass, isConnectingFromNodeId, id, isActive]);

  const wrapperProps = {
    onMouseEnter: (e) => {
      e.stopPropagation();
      onHoverEnter();
      pill.handleMouseEnter();
    },
    onMouseLeave: (e) => {
      e.stopPropagation();
      onHoverLeave();
      pill.handleMouseLeave();
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
        return;
      }
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
    onContextMenu: handleContextMenu,
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
        wrapperRef={wrapperRef}
        wrapperClassName={wrapperClassName}
        wrapperStyle={{ ...innerScaleStyle }}
        wrapperProps={wrapperProps as any}
        highlightClassName={`pointer-events-none absolute -inset-1 rounded-lg border-4 ${isActive ? 'border-black opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
      >
        <LockIndicator locked={locked} lockOwner={lockOwner} />
        {isConnectingFromNodeId === id && (
          <div className="absolute -top-3 right-0 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
        )}
        <div
          ref={contentRef}
          contentEditable={isEditing && !locked && !hidden && !isConnectMode}
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
          className={`text-sm leading-relaxed whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${isEditing ? 'nodrag' : ''} ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 text-gray-900'} ${isInContainer ? 'overflow-visible' : ''}`}
          title={typeof value === 'string' ? value : undefined}
        >
          {value || 'New comment'}
        </div>
        {hidden && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-sm text-stone-500 italic animate-fade-in">Hidden</div>
          </div>
        )}
        {!hidden && !grabMode && extras?.showExtras && (
          <div ref={(el) => extras.registerExtras?.(el)}>
            <NodeActionPill
              label="Reply"
              visible={isEditing ? true : (shouldShowPill && extras.showExtras)}
              onClick={() => { handleReply(); forceHidePills(); }}
              colorClass="bg-stone-900"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onForceHide={forceHidePills}
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
          { label: 'Delete node', danger: true, onClick: () => { if (locked) { toast.warning(`Locked by ${lockOwner?.name || 'another user'}`); } else { deleteNode(id); } } },
        ]}
      />
    </>
  );
};

export default CommentNode;
