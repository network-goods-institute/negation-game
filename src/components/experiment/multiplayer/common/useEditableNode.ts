import { useCallback, useEffect, useRef, useState } from "react";
import { useGraphActions } from "../GraphContext";

interface UseEditableNodeArgs {
  id: string;
  content: string;
  updateNodeContent: (nodeId: string, content: string) => void;
  startEditingNode?: (nodeId: string) => void;
  stopEditingNode?: (nodeId: string) => void;
  // Whether the node is currently selected in the canvas (for click semantics)
  isSelected?: boolean;
}

export const useEditableNode = ({
  id,
  content,
  updateNodeContent,
  startEditingNode,
  stopEditingNode,
  isSelected,
}: UseEditableNodeArgs) => {
  const graph = useGraphActions();
  const isConnectMode = Boolean((graph as any)?.connectMode);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content);
  const draftRef = useRef<string>("");
  const originalBeforeEditRef = useRef<string>("");
  const justCommittedRef = useRef<number>(0);
  const lastClickRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const updateTimerRef = useRef<number | null>(null);

  // Sync incoming content, allowing updates during editing for undo/redo
  useEffect(() => {
    const now = Date.now();
    const recentlyCommitted = now - justCommittedRef.current < 1500;

    if (!isEditing) {
      if (recentlyCommitted) {
        // Skip syncing from props briefly after a local commit to prevent flicker
        return;
      }
      if (value !== content) setValue(content);
      draftRef.current = content;
      if (contentRef.current && contentRef.current.innerText !== content) {
        contentRef.current.innerText = content;
      }
      return;
    }

    // While editing: Allow external updates (like undo/redo) but preserve caret
    if (content !== value && content !== draftRef.current) {
      setValue(content);
      draftRef.current = content;

      if (contentRef.current && contentRef.current.innerText !== content) {
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        const caretPos = range?.startOffset || 0;

        contentRef.current.innerText = content;

        // Restore caret position if possible
        try {
          const newRange = document.createRange();
          const textNode = contentRef.current.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const maxPos = Math.min(
              caretPos,
              textNode.textContent?.length || 0
            );
            newRange.setStart(textNode, maxPos);
            newRange.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          }
        } catch (e) {
          // Fallback: place caret at end
          const newRange = document.createRange();
          newRange.selectNodeContents(contentRef.current);
          newRange.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(newRange);
        }
      }
    }
  }, [content, isEditing, value]);

  // autosize height
  useEffect(() => {
    if (wrapperRef.current && contentRef.current) {
      wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;
    }
  }, [value]);

  // cleanup timers
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, []);

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

  const enterEditWithCaretAtPoint = (clientX: number, clientY: number) => {
    const el = contentRef.current;
    if (!el) return enterEditWithCaret();
    el.focus();
    let range: Range | null = null;
    const anyDoc: any = document as any;
    try {
      if (typeof (document as any).caretRangeFromPoint === "function") {
        range = (document as any).caretRangeFromPoint(
          clientX,
          clientY
        ) as Range | null;
      } else if (typeof anyDoc.caretPositionFromPoint === "function") {
        const pos = anyDoc.caretPositionFromPoint(clientX, clientY);
        if (pos) {
          range = document.createRange();
          range.setStart(
            pos.offsetNode,
            Math.min(
              pos.offset,
              (pos.offsetNode?.textContent?.length ?? pos.offset) as number
            )
          );
          range.collapse(true);
        }
      }
    } catch {}
    const sel = window.getSelection();
    if (range && el.contains(range.startContainer)) {
      try {
        sel?.removeAllRanges();
        sel?.addRange(range);
        return;
      } catch {}
    }
    enterEditWithCaret();
  };

  const debouncedUpdateNodeContent = useCallback(
    (nodeId: string, content: string) => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      updateTimerRef.current = window.setTimeout(() => {
        updateNodeContent(nodeId, content);
      }, 50);
    },
    [updateNodeContent]
  );

  const onClick = (e: React.MouseEvent) => {
    const now = Date.now();

    if (e.detail === 1) {
      const sel = window.getSelection();
      const hasRange = Boolean(
        sel &&
          sel.rangeCount > 0 &&
          !sel.isCollapsed &&
          contentRef.current &&
          contentRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)
      );
      if (hasRange) {
        e.preventDefault();
        e.stopPropagation();
        if (!isEditing) {
          originalBeforeEditRef.current = value;
          setIsEditing(true);
          startEditingNode?.(id);
          // Don't focus or manipulate selection - preserve the user's text selection
        }
        lastClickRef.current = now;
        return;
      }
    }

    if (graph?.connectMode) {
      e.preventDefault();
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();
      lastClickRef.current = now;
      return;
    }

    // Triple-click: select all (explicit only)
    if (e.detail >= 3) {
      e.preventDefault();
      if (!isEditing) originalBeforeEditRef.current = value;
      setIsEditing(true);
      setTimeout(focusSelectAll, 0);
      startEditingNode?.(id);
      lastClickRef.current = now;
      return;
    }

    // Double-click: enter edit with caret at click (do NOT select-all)
    if (e.detail === 2) {
      e.preventDefault();
      if (!isEditing) originalBeforeEditRef.current = value;
      setIsEditing(true);
      const { clientX, clientY } = e;
      setTimeout(() => enterEditWithCaretAtPoint(clientX, clientY), 0);
      startEditingNode?.(id);
      lastClickRef.current = now;
      return;
    }

    // Single click: enter edit mode if node is selected, or if it's a quick second click
    if (isSelected || now - lastClickRef.current <= 600) {
      if (!isEditing) originalBeforeEditRef.current = value;
      setIsEditing(true);
      const { clientX, clientY } = e;
      setTimeout(() => enterEditWithCaretAtPoint(clientX, clientY), 0);
      startEditingNode?.(id);
    }
    lastClickRef.current = now;
  };

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    draftRef.current = (e.target as HTMLDivElement).innerText;
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = window.setTimeout(() => {
      updateNodeContent(id, draftRef.current);
    }, 120);
    if (wrapperRef.current && contentRef.current) {
      wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;
    }
  };

  const commit = useCallback(() => {
    setIsEditing(false);
    stopEditingNode?.(id);
    if (draftRef.current !== value) {
      // After finishing edit, reflect the latest draft locally.
      setValue(draftRef.current);
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      updateNodeContent(id, draftRef.current);
    }
    // Force DOM to reflect final value so text updates immediately for the editor
    if (contentRef.current) {
      contentRef.current.innerText = draftRef.current;
    }
    // Prevent immediate prop-sync from clobbering our local commit
    justCommittedRef.current = Date.now();
    window.setTimeout(() => {
      if (Date.now() - justCommittedRef.current >= 1400) {
        justCommittedRef.current = 0;
      }
    }, 1500);
  }, [id, stopEditingNode, updateNodeContent, value]);

  useEffect(() => {
    if (!isConnectMode) return;
    window.getSelection()?.removeAllRanges();
    if (isEditing) {
      commit();
    }
  }, [commit, isConnectMode, isEditing]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Intercept global undo/redo while editing to avoid native contentEditable undo
    if (
      (e.metaKey || e.ctrlKey) &&
      (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "y")
    ) {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey || e.key.toLowerCase() === "y") {
        graph?.redo?.();
      } else {
        graph?.undo?.();
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      // Cancel: restore pre-edit content (since onInput pushes live changes)
      const original = originalBeforeEditRef.current;
      if (contentRef.current) contentRef.current.innerText = original;
      draftRef.current = original;
      setValue(original);
      updateNodeContent(id, original);
      setIsEditing(false);
      stopEditingNode?.(id);
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (document.activeElement === e.currentTarget) return;
    commit();
  };

  const onFocus = () => {
    startEditingNode?.(id);
  };

  const startEditingProgrammatically = () => {
    if (!isEditing) {
      setIsEditing(true);
      startEditingNode?.(id);
      // Focus and place cursor at the end
      setTimeout(() => {
        const el = contentRef.current;
        if (el) {
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false); // Move cursor to end
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 0);
    }
  };

  return {
    isEditing,
    value,
    setIsEditing,
    contentRef,
    wrapperRef,
    isConnectMode,
    onClick,
    onInput,
    onKeyDown,
    onBlur,
    onFocus,
    commit,
    startEditingProgrammatically,
    // Handle mouse events to allow text selection while preventing unwanted node dragging
    onContentMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      // Stop propagation to prevent the wrapper's mouse handlers from interfering with text selection
      e.stopPropagation();

      if (graph?.connectMode) {
        e.preventDefault();
        window.getSelection()?.removeAllRanges();
        return;
      }

      // Allow normal text selection behavior by not preventing default
    },
    onContentMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
      // Always prevent propagation to avoid interfering with text selection drag
      e.stopPropagation();
    },
  };
};
