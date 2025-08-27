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
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      // Undo/redo when modifier is held
      if (isMod) {
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo?.();
          } else {
            undo?.();
          }
          return;
        }
        if (key === 'y') {
          e.preventDefault();
          redo?.();
          return;
        }
      }
      // Mode keys without modifiers
      if (!isMod) {
        if (key === 'l') {
          // Toggle Connect mode
          extra?.onToggleConnect?.();
          e.preventDefault();
          return;
        }
        if (key === 'escape') {
          // Exit Connect mode
          extra?.onExitConnect?.();
          e.preventDefault();
          return;
        }
        if (key === 'v') {
          // Pointer mode
          extra?.onPointerMode?.();
          e.preventDefault();
          return;
        }
        if (key === 'h') {
          // Toggle grab (hand)
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
