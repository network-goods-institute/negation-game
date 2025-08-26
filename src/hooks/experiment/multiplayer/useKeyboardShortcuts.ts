import { useEffect } from 'react';

export const useKeyboardShortcuts = (undo?: () => void, redo?: () => void) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo?.();
        } else {
          undo?.();
        }
      } else if (key === 'y') {
        e.preventDefault();
        redo?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);
};