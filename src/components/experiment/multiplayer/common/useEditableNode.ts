import { useCallback, useEffect, useRef, useState } from "react";

interface UseEditableNodeArgs {
  id: string;
  content: string;
  updateNodeContent: (nodeId: string, content: string) => void;
  startEditingNode?: (nodeId: string) => void;
  stopEditingNode?: (nodeId: string) => void;
}

export const useEditableNode = ({
  id,
  content,
  updateNodeContent,
  startEditingNode,
  stopEditingNode,
}: UseEditableNodeArgs) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content);
  const draftRef = useRef<string>("");
  const lastClickRef = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const updateTimerRef = useRef<number | null>(null);

  // sync incoming content
  useEffect(() => {
    setValue(content);
    draftRef.current = content;
  }, [content]);

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
    if (e.detail === 2) {
      setIsEditing(true);
      setTimeout(focusSelectAll, 0);
      startEditingNode?.(id);
    } else if (e.detail >= 3) {
      setIsEditing(true);
      setTimeout(enterEditWithCaret, 0);
      startEditingNode?.(id);
    } else {
      if (now - lastClickRef.current > 350 && lastClickRef.current !== 0) {
        setIsEditing(true);
        setTimeout(enterEditWithCaret, 0);
        startEditingNode?.(id);
      }
      lastClickRef.current = now;
    }
  };

  const onInput = (e: React.FormEvent<HTMLDivElement>) => {
    draftRef.current = (e.target as HTMLDivElement).innerText;
    updateNodeContent(id, draftRef.current);
    if (wrapperRef.current && contentRef.current) {
      wrapperRef.current.style.minHeight = `${contentRef.current.scrollHeight}px`;
    }
  };

  const commit = () => {
    setIsEditing(false);
    stopEditingNode?.(id);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (document.activeElement === e.currentTarget) return;
    commit();
  };

  const onFocus = () => {
    startEditingNode?.(id);
  };

  return {
    isEditing,
    value,
    setIsEditing,
    contentRef,
    wrapperRef,
    onClick,
    onInput,
    onKeyDown,
    onBlur,
    onFocus,
    commit,
  };
};
