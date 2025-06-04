import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { connectNodesDialogAtom } from "@/atoms/connectNodesAtom";
import { mergeNodesDialogAtom } from "@/atoms/mergeNodesAtom";
import type { AppNode } from "@/components/graph/nodes/AppNode";
import type { ReactFlowInstance } from "@xyflow/react";
import { DuplicatePointNode } from "@/atoms/mergeNodesAtom";

/**
 * Returns a callback to handle node drag end events by opening the appropriate dialog (connect or merge)
 */
export function useGraphNodeDropHandler(
  flowInstance: ReactFlowInstance<AppNode> | null,
  canModify: boolean
) {
  const setConnectDialog = useSetAtom(connectNodesDialogAtom);
  const setMergeNodesDialog = useSetAtom(mergeNodesDialogAtom);

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

      // Find all overlapping nodes (excluding the dragged node itself)
      const allOverlappedNodes = flowInstance
        .getNodes()
        .filter(
          (n) =>
            n.id !== node.id &&
            Math.hypot(
              n.position.x - moved.position.x,
              n.position.y - moved.position.y
            ) < threshold
        );

      const draggedPointId = (node.data as any)?.pointId as number | undefined;

      const samePointOverlaps = allOverlappedNodes.filter(
        (overlapped) =>
          draggedPointId !== undefined &&
          (overlapped.data as any)?.pointId === draggedPointId
      );

      const differentPointOverlaps = allOverlappedNodes.filter(
        (overlapped) =>
          draggedPointId !== undefined &&
          (overlapped.data as any)?.pointId !== undefined &&
          (overlapped.data as any)?.pointId !== draggedPointId
      );

      if (samePointOverlaps.length > 0 && draggedPointId !== undefined) {
        // Merge case: Overlap with nodes representing the same point
        console.log("Same point overlap detected. Opening merge dialog.", [
          ...samePointOverlaps.map((n) => n.id),
          node.id,
        ]);
        const nodesToMerge = [moved, ...samePointOverlaps];

        const duplicateNodesList: DuplicatePointNode[] = nodesToMerge.map(
          (n) => {
            const pointId = (n.data as any)?.pointId as number | undefined;
            const parentEdges = flowInstance
              .getEdges()
              .filter((edge) => edge.target === n.id);
            const parentIds = parentEdges.map((edge) => edge.source);
            return {
              id: n.id,
              pointId: pointId!,
              parentIds: parentIds,
            };
          }
        );

        setMergeNodesDialog({
          isOpen: true,
          pointId: draggedPointId,
          duplicateNodes: duplicateNodesList,
          onClose: () =>
            setMergeNodesDialog({
              isOpen: false,
              pointId: 0,
              duplicateNodes: [],
            }),
        });
        // Close connect dialog if it was open
        setConnectDialog({
          isOpen: false,
          sourceId: "",
          targetId: "",
          onClose: undefined,
        });
      } else if (
        differentPointOverlaps.length > 0 &&
        draggedPointId !== undefined
      ) {
        // Connect case: Overlap with a node representing a different point
        // We only need one target for the connect dialog, so pick the first one that has a pointId
        const targetNode = differentPointOverlaps.find(
          (overlapped) => (overlapped.data as any)?.pointId !== undefined
        );

        if (targetNode) {
          console.log(
            "Different point overlap detected. Opening connect dialog for",
            node.id,
            "->",
            targetNode.id
          );
          setConnectDialog({
            isOpen: true,
            sourceId: node.id,
            targetId: targetNode.id,
            onClose: () =>
              setConnectDialog({
                isOpen: false,
                sourceId: "",
                targetId: "",
                onClose: undefined,
              }),
          });
          setMergeNodesDialog({
            isOpen: false,
            pointId: 0,
            duplicateNodes: [],
          });
        } else {
          console.log(
            "No valid different point overlap detected with a pointId. Closing dialogs."
          );
          setConnectDialog({
            isOpen: false,
            sourceId: "",
            targetId: "",
            onClose: undefined,
          });
          setMergeNodesDialog({
            isOpen: false,
            pointId: 0,
            duplicateNodes: [],
          });
        }
      } else {
        console.log(
          "No overlap detected or dragged node has no pointId. Closing dialogs."
        );
        setConnectDialog({
          isOpen: false,
          sourceId: "",
          targetId: "",
          onClose: undefined,
        });
        setMergeNodesDialog({
          isOpen: false,
          pointId: 0,
          duplicateNodes: [],
        });
      }
    },
    [flowInstance, canModify, setConnectDialog, setMergeNodesDialog]
  );
}
