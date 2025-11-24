import React, { useCallback, useRef } from 'react';
import { Position, useReactFlow } from '@xyflow/react';
import { useGraphActions } from './GraphContext';
import { toast } from 'sonner';
import { NodeActionPill } from './common/NodeActionPill';
import { usePerformanceMode } from './PerformanceContext';
import { useNodeChrome } from './common/useNodeChrome';
import { NodeShell } from './common/NodeShell';
import { useForceHidePills } from './common/useForceHidePills';
import { LockIndicator } from './common/LockIndicator';
import { useSelectionPayload } from './common/useSelectionPayload';

interface StatementNodeProps {
  id: string;
  data: { statement?: string };
  selected?: boolean;
}

export const StatementNode: React.FC<StatementNodeProps> = ({ id, data, selected }) => {
  const {
    updateNodeContent,
    updateNodePosition,
    addPointBelow,
    isConnectingFromNodeId,
    startEditingNode,
    stopEditingNode,
    isLockedForMe,
    getLockOwner,
    grabMode,
  } = useGraphActions() as any;
  const { perfMode } = usePerformanceMode();
  const rf = useReactFlow();

  const content = data?.statement || '';

  const locked = isLockedForMe?.(id) || false;
  const lockOwner = getLockOwner?.(id) || null;
  const hidden = (data as any)?.hidden === true;

  const getSelectedStatements = useCallback(() => {
    try {
      return rf.getNodes().filter((n: any) => n?.selected && n.type !== 'edge_anchor');
    } catch {
      return [];
    }
  }, [rf]);

  const { editable, hover, pill, connect, innerScaleStyle, isActive, cursorClass } = useNodeChrome({
    id,
    selected,
    content,
    updateNodeContent,
    startEditingNode,
    stopEditingNode,
    locked,
    hidden,
    pillDelay: 200,
    autoFocus: {
      createdAt: (data as any)?.createdAt,
      isQuestionNode: true,
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

  const { onMouseEnter, onMouseLeave } = hover;
  const { handleMouseEnter, handleMouseLeave, hideNow, shouldShowPill } = pill;

  const forceHidePills = useForceHidePills({
    id,
    hidePill: hideNow,
    onPillMouseLeave: handleMouseLeave,
    onHoverLeave: onMouseLeave,
  });

  const buildSelectionPayload = useSelectionPayload(id, getSelectedStatements);
  const capturedSelectionRef = useRef<string[] | null>(null);
  const pillHandledRef = useRef(false);

  const computeCenterPosition = useCallback(
    (
      selection: string[],
      positionsById: Record<string, { x: number; y: number }>,
      nodes: any[]
    ) => {
      const ids = selection.length > 0 ? selection : [id];
      const positions = ids
        .map((nid) => positionsById[nid])
        .filter((p): p is { x: number; y: number } => Boolean(p));

      if (positions.length > 0) {
        const centerX = positions.reduce((sum, pos) => sum + (pos.x ?? 0), 0) / positions.length;
        const centerY = positions.reduce((sum, pos) => sum + (pos.y ?? 0), 0) / positions.length;
        return { centerX, centerY };
      }

      if (nodes.length > 0) {
        const centerX = nodes.reduce((sum: number, n: any) => sum + (n.position?.x ?? 0), 0) / nodes.length;
        const centerY = nodes.reduce((sum: number, n: any) => sum + (n.position?.y ?? 0), 0) / nodes.length;
        return { centerX, centerY };
      }

      const fallback = rf.getNode(ids[0]);
      return {
        centerX: fallback?.position?.x ?? 0,
        centerY: fallback?.position?.y ?? 0,
      };
    },
    [id, rf]
  );

  const handlePillMouseDown = useCallback(() => {
    if (isConnectMode) return;
    const payload = buildSelectionPayload();
    const { ids: selection, positionsById, nodes: current } = payload;
    capturedSelectionRef.current = selection;
    pillHandledRef.current = true;
    const result = addPointBelow?.({ ids: selection, positionsById });
    if (result && updateNodePosition) {
      const { centerX, centerY } = computeCenterPosition(selection, positionsById, current);
      const newNodeId = typeof result === 'string' ? result : result.nodeId;
      if (newNodeId) {
        updateNodePosition(newNodeId, centerX, centerY + 32);
      }
    }
    capturedSelectionRef.current = null;
    forceHidePills();
  }, [isConnectMode, buildSelectionPayload, addPointBelow, updateNodePosition, computeCenterPosition, forceHidePills]);

  const handlePillClick = useCallback(() => {
    if (isConnectMode) return;
    if (pillHandledRef.current) {
      pillHandledRef.current = false;
      return;
    }
    const payload = buildSelectionPayload();
    const selection = (capturedSelectionRef.current && capturedSelectionRef.current.length > 0)
      ? capturedSelectionRef.current
      : payload.ids;
    const positionsById = payload.positionsById;
    const current = payload.nodes;
    const result = addPointBelow?.({ ids: selection, positionsById });
    if (result && updateNodePosition) {
      const { centerX, centerY } = computeCenterPosition(selection, positionsById, current);
      const newNodeId = typeof result === 'string' ? result : result.nodeId;
      if (newNodeId) {
        updateNodePosition(newNodeId, centerX, centerY + 32);
      }
    }
    capturedSelectionRef.current = null;
    forceHidePills();
  }, [isConnectMode, buildSelectionPayload, addPointBelow, updateNodePosition, computeCenterPosition, forceHidePills]);

  const rootRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <NodeShell
        handles={[
          {
            id: `${id}-source-handle`,
            type: 'source',
            position: Position.Bottom,
            style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
          },
          {
            id: `${id}-incoming-handle`,
            type: 'target',
            position: Position.Top,
            style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' },
          },
        ]}
        rootRef={rootRef}
        rootProps={{
          onMouseEnter: (e) => {
            e.stopPropagation();
            onMouseEnter();
            handleMouseEnter();
          },
          onMouseLeave: (e) => {
            e.stopPropagation();
            onMouseLeave();
            handleMouseLeave();
          },
        }}
        wrapperRef={wrapperRef}
        wrapperClassName={`px-5 py-3 rounded-xl ${hidden ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-900'} ${isActive ? 'border-0' : 'border-2'} ${cursorClass} min-w-[240px] max-w-[360px] relative z-10 transition-all duration-300 ease-out origin-center ${isActive ? '-translate-y-[1px] scale-[1.02]' : ''}
            ${isActive ? '' : (hidden ? 'border-blue-300' : 'border-blue-200')}
            ${isConnectingFromNodeId === id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md' : ''}
            data-[selected=true]:ring-2 data-[selected=true]:ring-black data-[selected=true]:ring-offset-2 data-[selected=true]:ring-offset-white`}
        wrapperStyle={innerScaleStyle}
        wrapperProps={{
          onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
            if (isConnectMode) {
              e.stopPropagation();
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
            if (locked) {
              e.stopPropagation();
              toast.warning(`Locked by ${lockOwner?.name || 'another user'}`);
              return;
            }
            onClick(e);
          },
          onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => {
            // Prevent double-click from bubbling up to canvas (which would spawn new nodes)
            e.stopPropagation();
            e.preventDefault();
          },
          'data-selected': selected,
        } as any}
        highlightClassName={`pointer-events-none absolute -inset-1 rounded-xl border-4 ${isActive ? 'border-blue-600 opacity-100 scale-100' : 'border-transparent opacity-0 scale-95'} transition-[opacity,transform] duration-300 ease-out z-0`}
      >
        <LockIndicator locked={locked} lockOwner={lockOwner} className="absolute -top-2 -right-2 z-20" />
        {isConnectingFromNodeId === id && (
          <div className="absolute -top-3 right-0 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
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
          className={`text-sm whitespace-pre-wrap break-words outline-none transition-opacity duration-200 ${isEditing ? 'nodrag' : ''} ${hidden ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}
        >
          {value || 'New Question'}
        </div>
        {hidden && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-sm text-stone-600 italic animate-fade-in">Hidden</div>
          </div>
        )}
        {!hidden && !perfMode && !grabMode && (
          <NodeActionPill
            label="Add Option"
            visible={shouldShowPill}
            onMouseDown={handlePillMouseDown}
            onClick={handlePillClick}
            colorClass="bg-blue-600"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onForceHide={forceHidePills}
          />
        )}
      </NodeShell>
    </>
  );
};
