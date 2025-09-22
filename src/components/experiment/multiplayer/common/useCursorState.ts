import { useMemo } from "react";
import { useGraphActions } from "../GraphContext";

interface UseCursorStateArgs {
  isEditing: boolean;
  locked?: boolean;
}

export const useCursorState = ({ isEditing, locked }: UseCursorStateArgs) => {
  const graph = useGraphActions();

  // Priority order: locked > editing > graph mode > default
  const cursorClass = useMemo(() => {
    if (locked) {
      return "cursor-not-allowed";
    }

    if (isEditing) {
      return "cursor-text";
    }

    // When grab mode is active, ReactFlow handles cursor - don't override
    if ((graph as any)?.grabMode) {
      return "";
    }

    return "cursor-pointer";
  }, [isEditing, locked, graph]);

  return cursorClass;
};
