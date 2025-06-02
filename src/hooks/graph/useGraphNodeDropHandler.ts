import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { connectNodesDialogAtom } from "@/atoms/connectNodesAtom";
import type { AppNode } from "@/components/graph/nodes/AppNode";
import type { ReactFlowInstance } from "@xyflow/react";

/**
 * Returns a callback to handle node drag end events by opening a connect dialog
 */
export function useGraphNodeDropHandler(
  flowInstance: ReactFlowInstance<AppNode> | null,
  canModify: boolean
) {
  const setConnectDialog = useSetAtom(connectNodesDialogAtom);

  return useCallback(
    (event: React.MouseEvent, node: AppNode) => {
      console.log("handleNodeDragStop called for node", node.id, {
        canModify,
        hasFlow: Boolean(flowInstance),
      });
      if (!canModify || !flowInstance) {
        console.log("Cannot modify or missing flow instance");
        return;
      }
      const moved = flowInstance.getNodes().find((n) => n.id === node.id);
      console.log("Moved node:", moved);
      if (!moved) {
        console.log("Moved node data not found");
        return;
      }
      const threshold = 50;
      const overlapped = flowInstance
        .getNodes()
        .find(
          (n) =>
            n.id !== node.id &&
            Math.hypot(
              n.position.x - moved.position.x,
              n.position.y - moved.position.y
            ) < threshold
        );
      console.log(
        "Overlap check for node",
        node.id,
        "found overlapped:",
        overlapped?.id
      );
      if (overlapped) {
        console.log("Opening connect dialog for", node.id, "->", overlapped.id);
        setConnectDialog({
          isOpen: true,
          sourceId: node.id,
          targetId: overlapped.id,
          onClose: () =>
            setConnectDialog({
              isOpen: false,
              sourceId: "",
              targetId: "",
              onClose: undefined,
            }),
        });
      } else {
        // Close dialog if opened and nodes are no longer overlapping
        setConnectDialog({
          isOpen: false,
          sourceId: "",
          targetId: "",
          onClose: undefined,
        });
      }
    },
    [flowInstance, canModify, setConnectDialog]
  );
}
