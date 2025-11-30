import { useCallback, useEffect, useRef, useState } from "react";
import { useGraphActions } from "../GraphContext";
import { useCursorState } from "./useCursorState";

interface UseEditableNodeArgs {
  id: string;
  content: string;
  updateNodeContent: (nodeId: string, content: string) => void;
  startEditingNode?: (nodeId: string) => void;
  stopEditingNode?: (nodeId: string) => void;
  // Whether the node is currently selected in the canvas (for click semantics)
  isSelected?: boolean;
  blurImmediately?: boolean;
}

export const useEditableNode = ({
  id,
  content,
  updateNodeContent,
  startEditingNode,
  stopEditingNode,
  isSelected,
  blurImmediately,
}: UseEditableNodeArgs) => {
  const graph = useGraphActions();
  const isConnectMode = Boolean((graph as any)?.connectMode);
  const updateNodePosition = graph?.updateNodePosition;
  const [isEditing, setIsEditing] = useState(false);
  const cursorClass = useCursorState({ isEditing, locked: false });
  const [value, setValue] = useState(content);
  const draftRef = useRef<string>("");
  const originalBeforeEditRef = useRef<string>("");
  const justCommittedRef = useRef<number>(0);
  const lastClickRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const updateTimerRef = useRef<number | null>(null);
  const previousWidthRef = useRef<number>(0);
  const selectionBookmarkRef = useRef<{
    start: number;
    end: number;
    direction: "forward" | "backward" | "none";
  } | null>(null);

  // Sync incoming content, allowing updates during editing for undo/redo
  useEffect(() => {
    const now = Date.now();
    const recentlyCommitted = now - justCommittedRef.current < 1500;

    if (!isEditing) {
      if (recentlyCommitted && content === draftRef.current) {
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
        // Record selection before updating content
        if (isEditing) {
          try {
            const el = contentRef.current;
            if (el) {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (
                  el.contains(range.startContainer) &&
                  el.contains(range.endContainer)
                ) {
                  const preSelectionRange = range.cloneRange();
                  preSelectionRange.selectNodeContents(el);
                  preSelectionRange.setEnd(
                    range.startContainer,
                    range.startOffset
                  );
                  const start = preSelectionRange.toString().length;
                  const selectionTextLength = range.toString().length;
                  const end = start + selectionTextLength;

                  selectionBookmarkRef.current = {
                    start,
                    end,
                    direction:
                      selectionTextLength === 0
                        ? "none"
                        : selection.anchorNode === range.startContainer &&
                            selection.anchorOffset === range.startOffset
                          ? "forward"
                          : "backward",
                  };
                }
              }
            }
          } catch {}
        }

        contentRef.current.innerText = content;

        if (isEditing) {
          requestAnimationFrame(() => {
            try {
              const el = contentRef.current;
              const bookmark = selectionBookmarkRef.current;
              if (el && bookmark) {
                const selection = window.getSelection();
                if (selection) {
                  const startPoint = (() => {
                    const walker = document.createTreeWalker(
                      el,
                      NodeFilter.SHOW_TEXT,
                      null
                    );
                    let remaining = bookmark.start;
                    while (walker.nextNode()) {
                      const node = walker.currentNode as Text;
                      const length = node.textContent?.length ?? 0;
                      if (remaining <= length) {
                        return {
                          node,
                          offset: Math.max(0, Math.min(remaining, length)),
                        };
                      }
                      remaining -= length;
                    }
                    return { node: el, offset: el.childNodes.length };
                  })();

                  const endPoint = (() => {
                    const walker = document.createTreeWalker(
                      el,
                      NodeFilter.SHOW_TEXT,
                      null
                    );
                    let remaining = bookmark.end;
                    while (walker.nextNode()) {
                      const node = walker.currentNode as Text;
                      const length = node.textContent?.length ?? 0;
                      if (remaining <= length) {
                        return {
                          node,
                          offset: Math.max(0, Math.min(remaining, length)),
                        };
                      }
                      remaining -= length;
                    }
                    return { node: el, offset: el.childNodes.length };
                  })();

                  if (startPoint && endPoint) {
                    const range = document.createRange();
                    try {
                      range.setStart(startPoint.node, startPoint.offset);
                      range.setEnd(endPoint.node, endPoint.offset);
                    } catch {
                      return;
                    }

                    selection.removeAllRanges();

                    if (
                      bookmark.direction === "backward" &&
                      typeof selection.extend === "function"
                    ) {
                      selection.addRange(range);
                      selection.collapse(endPoint.node, endPoint.offset);
                      try {
                        selection.extend(startPoint.node, startPoint.offset);
                      } catch {
                        selection.removeAllRanges();
                        selection.addRange(range);
                      }
                      return;
                    }

                    selection.addRange(range);
                  }
                }
              }
            } catch {}
          });
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

  const resetMargins = useCallback(() => {
    if (wrapperRef.current) {
      wrapperRef.current.style.marginLeft = "0px";
      wrapperRef.current.style.marginRight = "0px";
    }
    previousWidthRef.current = 0;
    totalWidthOffsetRef.current = 0;
  }, []);

  const totalWidthOffsetRef = useRef<number>(0);

  const commit = useCallback(() => {
    resetMargins();
    setIsEditing(false);
    stopEditingNode?.(id);
    selectionBookmarkRef.current = null;
    if (draftRef.current !== value) {
      setValue(draftRef.current);
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      updateNodeContent(id, draftRef.current);
    }
    if (contentRef.current) {
      contentRef.current.innerText = draftRef.current;
    }
    justCommittedRef.current = Date.now();
    window.setTimeout(() => {
      if (Date.now() - justCommittedRef.current >= 1400) {
        justCommittedRef.current = 0;
      }
    }, 1500);
  }, [id, stopEditingNode, updateNodeContent, value, resetMargins]);

  // cleanup timers
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (blurImmediately && isEditing) {
      commit();
    }
  }, [blurImmediately, isEditing, commit]);

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

    // Double-click: if not editing, enter edit with caret at click; if editing, allow native word selection
    if (e.detail === 2) {
      if (!isEditing) {
        // Not editing: enter edit mode with caret at click position
        e.preventDefault();
        originalBeforeEditRef.current = value;
        setIsEditing(true);
        const { clientX, clientY } = e;
        setTimeout(() => enterEditWithCaretAtPoint(clientX, clientY), 0);
        startEditingNode?.(id);
        lastClickRef.current = now;
        return;
      } else {
        // Already editing: allow native browser word selection (don't preventDefault)
        lastClickRef.current = now;
        return;
      }
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

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    draftRef.current = (e.target as HTMLDivElement).innerText;
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
    updateNodeContent(id, draftRef.current);
    if (wrapperRef.current && contentRef.current) {
      wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;

      // Apply CSS transform to expand node from center
      const currentWidth = contentRef.current.scrollWidth;
      if (
        previousWidthRef.current > 0 &&
        currentWidth !== previousWidthRef.current
      ) {
        const widthDiff = currentWidth - previousWidthRef.current;
        totalWidthOffsetRef.current += widthDiff;

        // Apply cumulative margins to keep expansion centered
        // Handle both expansion (positive diff) and contraction (negative diff)
        if (wrapperRef.current) {
          const offset = totalWidthOffsetRef.current / 2;
          wrapperRef.current.style.marginLeft = `-${offset}px`;
          wrapperRef.current.style.marginRight = `${offset}px`;
        }
      }

      previousWidthRef.current = currentWidth;
    }
    // Record selection bookmark for potential undo/redo
    try {
      const el = contentRef.current;
      if (el) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (
            el.contains(range.startContainer) &&
            el.contains(range.endContainer)
          ) {
            const preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(el);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            const start = preSelectionRange.toString().length;
            const selectionTextLength = range.toString().length;
            const end = start + selectionTextLength;

            selectionBookmarkRef.current = {
              start,
              end,
              direction:
                selectionTextLength === 0
                  ? "none"
                  : selection.anchorNode === range.startContainer &&
                      selection.anchorOffset === range.startOffset
                    ? "forward"
                    : "backward",
            };
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!isConnectMode) return;
    window.getSelection()?.removeAllRanges();
    if (isEditing) {
      commit();
    }
  }, [commit, isConnectMode, isEditing]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      // Just exit editing mode, keeping current content
      resetMargins();
      setIsEditing(false);
      stopEditingNode?.(id);
      selectionBookmarkRef.current = null;
      // Ensure draft is committed
      if (draftRef.current !== value) {
        setValue(draftRef.current);
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
          updateTimerRef.current = null;
        }
        updateNodeContent(id, draftRef.current);
      }
      if (contentRef.current) {
        contentRef.current.innerText = draftRef.current;
      }
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (document.activeElement === e.currentTarget) return;

    // Check if focus is moving to a related element (within same node wrapper)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && wrapperRef.current?.contains(relatedTarget)) {
      return;
    }

    // If relatedTarget is null, it could be either:
    // - A user clicked away to a non-focusable surface (we should commit/exit), or
    // - A transient layout/DOM update (focus will return; we should NOT exit).
    // Defer briefly: if focus returns to our content element, do nothing; otherwise, commit.
    if (!relatedTarget) {
      setTimeout(() => {
        if (
          contentRef.current &&
          document.activeElement === contentRef.current
        ) {
          return;
        }
        if (isEditing && document.activeElement !== contentRef.current) {
          commit();
        }
      }, 50);
      return;
    }

    commit();
  };

  const onFocus = () => {
    startEditingNode?.(id);
  };

  const startEditingProgrammatically = () => {
    if (!isEditing) {
      setIsEditing(true);
      startEditingNode?.(id);

      const attemptFocus = () => {
        const el = contentRef.current;
        if (!el) {
          requestAnimationFrame(attemptFocus);
          return;
        }

        // Check if element is actually focusable and in the DOM
        if (document.contains(el) && el.offsetParent !== null) {
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        } else {
          // Still not ready, try again
          requestAnimationFrame(attemptFocus);
        }
      };

      requestAnimationFrame(attemptFocus);
    }
  };

  return {
    isEditing,
    value,
    setIsEditing,
    contentRef,
    wrapperRef,
    isConnectMode,
    cursorClass,
    onClick,
    onInput,
    onPaste,
    onKeyDown,
    onBlur,
    onFocus,
    commit,
    startEditingProgrammatically,
    // Handle mouse events to allow text selection while preventing unwanted node dragging
    onContentMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      if (isEditing) return; // allow native selection/caret when editing
      // Track mouse down time for selection containment logic
      (e as any)._mouseDownTime = Date.now();

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
      if (isEditing) return;
      // Always prevent propagation to avoid interfering with text selection drag
      e.stopPropagation();
    },
    onContentMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
      if (isEditing) return;
      // When mouse leaves content area during text selection, stop the selection
      // to prevent global text selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        // Check if the selection is still within our content area
        const range = selection.getRangeAt(0);
        const contentEl = e.currentTarget;

        // If selection extends beyond our content area, collapse it to the end
        if (
          !contentEl.contains(range.startContainer) ||
          !contentEl.contains(range.endContainer)
        ) {
          // Only collapse if we're actually selecting text (not just hovering)
          const mouseDownTime = (e as any)._mouseDownTime || 0;
          const timeSinceMouseDown = Date.now() - mouseDownTime;

          // If mouse was pressed recently, this is likely a drag selection
          if (timeSinceMouseDown < 300) {
            selection.collapseToEnd();
          }
        }
      }
      e.stopPropagation();
    },
    onContentMouseUp: (e: React.MouseEvent<HTMLDivElement>) => {
      if (isEditing) return;
      // Clean up any lingering selection state
      delete (e as any)._mouseDownTime;
      e.stopPropagation();
    },
  };
};
