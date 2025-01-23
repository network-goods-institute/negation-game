import { MouseEventHandler } from "react";

export const preventDefaultIfContainsSelection: MouseEventHandler = (e) => {
  const allowPartialContainment = true;
  const selection = window.getSelection();
  if (
    selection &&
    !selection.isCollapsed &&
    selection.containsNode(
      e.target as HTMLAnchorElement,
      allowPartialContainment,
    )
  ) {
    e.preventDefault();
  }
};
