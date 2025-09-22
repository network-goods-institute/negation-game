import { useEffect } from 'react';

interface ExtraShortcuts {
  onToggleConnect?: () => void; // L
  onExitConnect?: () => void;   // Esc
  onPointerMode?: () => void;    // V
  onToggleGrab?: () => void;     // H
}

export const useKeyboardShortcuts = (
  undo?: () => void,
  redo?: () => void,
  extra?: ExtraShortcuts
) => {
  useEffect(() => {
    const isEditableElement = (element: HTMLElement | null) => {
      if (!element) return false;
      const tag = element.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (element.isContentEditable) return true;
      const role = element.getAttribute('role');
      if (role && role.toLowerCase() === 'textbox') return true;
      return false;
    };

    const eventTargetsIncludeEditable = (event: KeyboardEvent) => {
      if (isEditableElement(event.target as HTMLElement | null)) return true;
      if (isEditableElement((document.activeElement as HTMLElement | null) || null)) return true;

      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      for (const entry of path) {
        if (!entry || typeof entry !== 'object') continue;
        const candidate = entry as HTMLElement;
        if (typeof candidate.tagName === 'string' && isEditableElement(candidate)) {
          return true;
        }
      }
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      if (eventTargetsIncludeEditable(e)) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      // Undo/redo when modifier is held
      if (isMod) {
        if (key === 'z') {
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) {
            redo?.();
          } else {
            undo?.();
          }
          return;
        }
        if (key === 'y') {
          e.preventDefault();
          e.stopPropagation();
          redo?.();
          return;
        }
      }
      // Mode keys without modifiers
      if (!isMod) {
        if (e.repeat) {
          return;
        }
        if (key === 'l') {
          // Toggle Connect mode
          e.stopPropagation();
          extra?.onToggleConnect?.();
          e.preventDefault();
          return;
        }
        if (key === 'escape') {
          // Exit Connect mode
          e.stopPropagation();
          extra?.onExitConnect?.();
          e.preventDefault();
          return;
        }
        if (key === 'v') {
          // Pointer mode
          e.stopPropagation();
          extra?.onPointerMode?.();
          e.preventDefault();
          return;
        }
        if (key === 'h') {
          // Toggle grab (hand)
          e.stopPropagation();
          extra?.onToggleGrab?.();
          e.preventDefault();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, extra]);
};
