import React from 'react';

interface UseContextMenuHandlerOptions {
  isEditing: boolean;
  onOpenMenu: (pos: { x: number; y: number; nodeRect?: DOMRect; nodeEl?: HTMLElement | null }) => void;
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

    // Get the node element's bounding rect
    const nodeElement = e.currentTarget.closest('.react-flow__node');
    const nodeRect = nodeElement?.getBoundingClientRect();

    onOpenMenu({ x: e.clientX, y: e.clientY, nodeRect: nodeRect || undefined, nodeEl: (nodeElement as HTMLElement) || null });
  };
};
