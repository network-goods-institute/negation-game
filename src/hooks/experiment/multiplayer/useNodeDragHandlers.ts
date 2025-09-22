import { useCallback, useRef } from "react";
import { toast } from "sonner";

interface UseNodeDragHandlersProps {
  lockNode: (nodeId: string, kind: "edit" | "drag") => void;
  unlockNode: (nodeId: string) => void;
  isLockedForMe?: (nodeId: string) => boolean;
  getLockOwner?: (
    nodeId: string
  ) => {
    readonly name: string;
    readonly color: string;
    readonly kind: "edit" | "drag";
  } | null;
  connectMode?: boolean;
}

export const useNodeDragHandlers = ({
  lockNode,
  unlockNode,
  isLockedForMe,
  getLockOwner,
  connectMode,
}: UseNodeDragHandlersProps) => {
  const isDraggingRef = useRef<boolean>(false);

  const handleNodeDragStart = useCallback(
    (_: any, node: any) => {
      if (connectMode) {
        return;
      }
      if (isLockedForMe?.(node.id)) {
        const owner = getLockOwner?.(node.id);
        toast.warning(`Locked by ${owner?.name || "another user"}`);
        return;
      }
      isDraggingRef.current = true;
      lockNode(node.id, "drag");
    },
    [connectMode, lockNode, isLockedForMe, getLockOwner]
  );

  const handleNodeDragStop = useCallback(
    (_: any, node: any) => {
      isDraggingRef.current = false;
      setTimeout(() => {
        unlockNode(node.id);
      }, 150);
    },
    [unlockNode]
  );

  return { handleNodeDragStart, handleNodeDragStop, isDraggingRef };
};
