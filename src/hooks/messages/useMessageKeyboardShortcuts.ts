import { useEffect } from 'react';

interface UseMessageKeyboardShortcutsProps {
  onEscape?: () => void;
  onSearch?: () => void;
  enabled?: boolean;
}

export const useMessageKeyboardShortcuts = ({
  onEscape,
  onSearch,
  enabled = true,
}: UseMessageKeyboardShortcutsProps) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLElement && event.target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onEscape?.();
          break;
        case '/':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onSearch?.();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, onSearch, enabled]);
};