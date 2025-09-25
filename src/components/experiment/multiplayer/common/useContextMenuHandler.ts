import React from 'react';

interface UseContextMenuHandlerOptions {
  isEditing: boolean;
  onOpenMenu: (pos: { x: number; y: number }) => void;
}

/**
 * Creates a context menu handler that allows native browser context menu
 * (including spellcheck suggestions) when actively editing text, otherwise
 * shows custom context menu.
 */
export const useContextMenuHandler = ({
  isEditing,
  onOpenMenu,
}: UseContextMenuHandlerOptions) => {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't override native context menu when actively editing (for spellcheck)
    if (isEditing) return;
    e.preventDefault();
    onOpenMenu({ x: e.clientX, y: e.clientY });
  };
};