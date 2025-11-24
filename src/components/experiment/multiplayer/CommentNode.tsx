import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { NodeActionPill } from './common/NodeActionPill';
import { toast } from 'sonner';
import { useNodeChrome } from './common/useNodeChrome';
import { NodeShell } from './common/NodeShell';
import { LockIndicator } from './common/LockIndicator';
import { useForceHidePills } from './common/useForceHidePills';
import { usePerformanceMode } from './PerformanceContext';
import { useSelectionPayload } from './common/useSelectionPayload';

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
    startEditingNode,
    stopEditingNode,
    isLockedForMe,
    getLockOwner,
    setPairNodeHeight,
    addPointBelow,
    grabMode,
    updateNodeType,
  } = useGraphActions() as any;

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const hidden = data.hidden === true;
  const { perfMode } = usePerformanceMode();
  const rf = useReactFlow();

  const getSelectedComments = useCallback(() => {
    try {
      return rf.getNodes().filter((n: any) => n?.selected && n.type !== 'edge_anchor');
    } catch {
      return [];
    }
  }, [rf]);

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

  const { handleMouseEnter, handleMouseLeave, hideNow, shouldShowPill } = pill;

  const forceHidePills = useForceHidePills({
    id,
    hidePill: hideNow,
    onPillMouseLeave: handleMouseLeave,
    onHoverLeave: onHoverLeave,
  });

  // Capture selection on mousedown to avoid ReactFlow deselecting during click
  const capturedSelectionRef = useRef<string[] | null>(null);
  const pillHandledRef = useRef(false);
  const buildSelectionPayload = useSelectionPayload(id, getSelectedComments);

  const positionNewComment = useCallback(
    (
      result: { nodeId?: string } | string | undefined,
      selection: string[]
    ) => {
      if (!result) return;
      const newNodeId = typeof result === 'string' ? result : result?.nodeId;
      if (!newNodeId) return;
      if (updateNodeType) {
        updateNodeType(newNodeId, 'comment');
      }
      startEditingNode?.(newNodeId);
    },
    [updateNodeType, startEditingNode]
  );

  const handlePillMouseDown = useCallback(() => {
    if (isConnectMode) return;
    const payload = buildSelectionPayload();
    const { ids: selection, positionsById } = payload;
    capturedSelectionRef.current = selection;
    pillHandledRef.current = true;
    const result = addPointBelow?.({ ids: selection, positionsById });
    positionNewComment(result, selection);
    capturedSelectionRef.current = null;
    forceHidePills();
  }, [isConnectMode, buildSelectionPayload, addPointBelow, positionNewComment, forceHidePills]);


  const handleReply = useCallback(() => {
    if (isConnectMode || locked) return;

    if (pillHandledRef.current) {
      pillHandledRef.current = false;
      return;
    }

    const payload = buildSelectionPayload();
    const selection = (capturedSelectionRef.current && capturedSelectionRef.current.length > 0)
      ? capturedSelectionRef.current
      : payload.ids;
    const positionsById = payload.positionsById;
    const result = addPointBelow?.({ ids: selection, positionsById });

    capturedSelectionRef.current = null;

    positionNewComment(result, selection);
  }, [isConnectMode, locked, buildSelectionPayload, addPointBelow, positionNewComment]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
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
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      if (isConnectMode) {
        e.stopPropagation();
        return;
      }
    },
    onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
    },
    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
      if (isConnectMode) {
        const handled = connect.onClick(e);
        if (handled) {
          return;
        }
      }
      if (locked) {
        e.stopPropagation();
        toast.warning(`Locked by ${lockOwner?.name || 'another user'}`);
        return;
      }
      onClick(e);
    },
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
            style: { left: '12%', top: '10%', transform: 'translate(-50%, -50%)' },
          },
          {
            id: `${id}-incoming-handle`,
            type: 'target',
            position: Position.Top,
            style: { left: '12%', top: '10%', transform: 'translate(-50%, -50%)' },
          },
        ]}
        rootRef={rootRef}
        rootProps={{
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
        }}
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
          contentEditable={isEditing && !locked && !hidden}
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
        {!hidden && !perfMode && !grabMode && (
          <NodeActionPill
            label="Reply"
            visible={shouldShowPill}
            onMouseDown={handlePillMouseDown}
            onClick={() => { if (isConnectMode) return; handleReply(); forceHidePills(); capturedSelectionRef.current = null; }}
            colorClass="bg-stone-900"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onForceHide={forceHidePills}
          />
        )}
      </NodeShell>
    </>
  );
};

export default CommentNode;
