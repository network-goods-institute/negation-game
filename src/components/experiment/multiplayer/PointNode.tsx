import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGraphActions } from './GraphContext';

interface PointNodeProps {
  data: {
    content: string;
    editedBy?: string;
  };
  id: string;
}

export const PointNode: React.FC<PointNodeProps> = ({ data, id }) => {
  const { updateNodeContent, addNegationBelow, isConnectingFromNodeId, deleteNode } = useGraphActions();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(data.content);
  const lastClickRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<string>('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pillVisible, setPillVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const updateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setValue(data.content);
    draftRef.current = data.content;
  }, [data.content]);

  const debouncedUpdateNodeContent = useCallback((nodeId: string, content: string) => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    updateTimerRef.current = window.setTimeout(() => {
      updateNodeContent(nodeId, content);
    }, 150);
  }, [updateNodeContent]);

  const focusSelectAll = () => {
    const el = contentRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const enterEditWithCaret = () => {
    const el = contentRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };


  const onClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (e.detail === 2) {
      setIsEditing(true);
      setTimeout(focusSelectAll, 0);
    } else if (e.detail >= 3) {
      setIsEditing(true);
      setTimeout(enterEditWithCaret, 0);
    } else {
      if (now - lastClickRef.current > 350 && lastClickRef.current !== 0) {
        setIsEditing(true);
        setTimeout(enterEditWithCaret, 0);
      }
      lastClickRef.current = now;
    }
  };

  const commit = () => {
    setIsEditing(false);
    if (draftRef.current !== value) {
      setValue(draftRef.current);
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      updateNodeContent(id, draftRef.current);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    draftRef.current = (e.target as HTMLDivElement).innerText;
    debouncedUpdateNodeContent(id, draftRef.current);
    if (wrapperRef.current && contentRef.current) {
      wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (wrapperRef.current && contentRef.current) {
      wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
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

  const shouldShowPill = pillVisible && !isEditing;

  return (
    <>
      <Handle id={`${id}-source-handle`} type="source" position={Position.Top} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      <Handle id={`${id}-incoming-handle`} type="target" position={Position.Bottom} className="opacity-0 pointer-events-none" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
      {/* DISABLED: ContextMenu causes infinite PopperAnchor loops in Chrome */}
      {/* <ContextMenu.Root>
        <ContextMenu.Trigger asChild> */}
      <div
        ref={wrapperRef}
        onMouseEnter={() => { setHovered(true); cancelHide(); setPillVisible(true); }}
        onMouseLeave={() => { setHovered(false); scheduleHide(); }}
        onClick={onClick}
        className={`px-4 py-3 rounded-lg bg-white border-2 border-stone-200 inline-block min-w-[200px] max-w-[320px] relative cursor-text ${isConnectingFromNodeId === id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white shadow-md' : ''}`}
      >
        {isConnectingFromNodeId === id && (
          <div className="absolute -top-3 right-0 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full shadow">From</div>
        )}
        <div
          ref={contentRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onInput={onInput}
          onBlur={(e) => {
            if (document.activeElement === e.currentTarget) return;
            commit();
          }}
          onKeyDown={onKeyDown}
          className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap break-words outline-none"
        >
          {value}
        </div>

        {data.editedBy && (
          <div className="absolute -top-6 left-0 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
            {data.editedBy}
          </div>
        )}
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); addNegationBelow(id); }}
          onMouseEnter={() => { cancelHide(); setPillVisible(true); }}
          onMouseLeave={() => { scheduleHide(); }}
          className={`absolute left-1/2 -translate-x-1/2 translate-y-2 bottom-[-22px] rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-stone-800 text-white transition-opacity duration-200 ${shouldShowPill ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          Negate
        </button>
      </div>
      {/* </ContextMenu.Trigger>
        <ContextMenu.Content className="min-w-[160px] bg-popover text-popover-foreground rounded-md border shadow-md p-1 z-50">
          <ContextMenu.Item
            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent hover:text-accent-foreground focus:text-accent-foreground"
            onSelect={() => deleteNode(id)}
          >
            Delete node
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root> */}
    </>
  );
};