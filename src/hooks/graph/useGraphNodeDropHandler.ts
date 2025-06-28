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
  flowInstance: ReactFlowInstance<AppNode> | null
) {
  const setConnectDialog = useSetAtom(connectNodesDialogAtom);
  const setMergeNodesDialog = useSetAtom(mergeNodesDialogAtom);

  return useCallback(
    (event: React.MouseEvent, node: AppNode) => {
      console.log("handleNodeDragStop called for node", node.id, {
        hasFlow: Boolean(flowInstance),
      });
      // Require a valid React Flow instance
      if (!flowInstance) {
        console.log("Missing flow instance");
        return;
      }
      const moved = flowInstance.getNodes().find((n) => n.id === node.id);
      console.log("Moved node:", moved);
      if (!moved) {
        console.log("Moved node data not found");
        return;
      }
      // Bounding-box intersection detection (more sensitive overlap)
      const allOverlappedNodes = flowInstance.getNodes().filter((n) => {
        if (n.id === node.id) return false;

        // Calculate centers of the two nodes
        const movedWidth = moved.measured?.width ?? 250;
        const movedHeight = moved.measured?.height ?? 160;
        const nWidth = n.measured?.width ?? 250;
        const nHeight = n.measured?.height ?? 160;

        const movedCenterX = moved.position.x + movedWidth / 2;
        const movedCenterY = moved.position.y + movedHeight / 2;
        const nCenterX = n.position.x + nWidth / 2;
        const nCenterY = n.position.y + nHeight / 2;

        const distance = Math.sqrt(
          Math.pow(movedCenterX - nCenterX, 2) +
            Math.pow(movedCenterY - nCenterY, 2)
        );

        // Use a threshold for overlap detection
        const OVERLAP_THRESHOLD = 95; // 95% of average dimension, adjusted from previous 80/60

        return distance < OVERLAP_THRESHOLD;
      });

      const draggedPointId = (node.data as any)?.pointId as number | undefined;

      const samePointOverlaps = allOverlappedNodes.filter(
        (overlapped) =>
          draggedPointId !== undefined &&
          (overlapped.data as any)?.pointId === draggedPointId
      );

      const differentPointOverlaps = allOverlappedNodes.filter(
        (overlapped) =>
          draggedPointId !== undefined &&
          ((overlapped.data as any)?.pointId !== undefined &&
          (overlapped.data as any)?.pointId !== draggedPointId) ||
          overlapped.type === "statement"
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
        // Connect case: Overlap with a node representing a different point or statement
        // We only need one target for the connect dialog, so pick the first one that has a pointId or is a statement
        const targetNode = differentPointOverlaps.find(
          (overlapped) => (overlapped.data as any)?.pointId !== undefined || overlapped.type === "statement"
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
    [flowInstance, setConnectDialog, setMergeNodesDialog]
  );
}
