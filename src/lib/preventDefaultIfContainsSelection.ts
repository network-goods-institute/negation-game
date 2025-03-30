import { MouseEventHandler } from "react";

export const preventDefaultIfContainsSelection: MouseEventHandler = (e) => {
  const selection = window.getSelection();

  // If there is a selection (text is selected)
  if (selection && !selection.isCollapsed) {
    // Check if the selection is within the clicked element or its children
    const range = selection.getRangeAt(0);
    const clickedElement = e.currentTarget as Node;

    // If the clicked element contains any part of the selection
    // OR if the selection contains the clicked element
    if (
      clickedElement.contains(range.startContainer) ||
      clickedElement.contains(range.endContainer) ||
      range.intersectsNode(clickedElement)
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }
};
