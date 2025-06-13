import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSetAtom } from "jotai";
import {
  mergeNodesDialogAtom,
  DuplicatePointNode,
} from "@/atoms/mergeNodesAtom";
import { PreviewAppNode } from "@/types/rationaleGraph";
import { PreviewPointNodeData } from "@/components/chatbot/preview/PreviewPointNode";

function findOverlappingPreviewNodes(
  allNodes: PreviewAppNode[],
  threshold = 95
): Map<string, string[]> {
  const overlaps = new Map<string, string[]>();

  for (let i = 0; i < allNodes.length; i++) {
    const nodeA = allNodes[i];
    if (nodeA.type !== "point") continue;

    const overlappingNodes: string[] = [];

    for (let j = 0; j < allNodes.length; j++) {
      if (i === j) continue;
      const nodeB = allNodes[j];
      if (nodeB.type !== "point") continue;

      // Check if nodes have the same content
      const dataA = nodeA.data as PreviewPointNodeData;
      const dataB = nodeB.data as PreviewPointNodeData;
      if (!dataA.content || !dataB.content || dataA.content !== dataB.content)
        continue;

      // Check physical overlap
      const aw = nodeA.measured?.width ?? 250;
      const ah = nodeA.measured?.height ?? 160;
      const bw = nodeB.measured?.width ?? 250;
      const bh = nodeB.measured?.height ?? 160;

      const centerAX = nodeA.position.x + aw / 2;
      const centerAY = nodeA.position.y + ah / 2;
      const centerBX = nodeB.position.x + bw / 2;
      const centerBY = nodeB.position.y + bh / 2;

      const distance = Math.sqrt(
        Math.pow(centerAX - centerBX, 2) + Math.pow(centerAY - centerBY, 2)
      );

      if (distance < threshold) {
        overlappingNodes.push(nodeB.id);
      }
    }

    if (overlappingNodes.length > 0) {
      overlaps.set(nodeA.id, overlappingNodes);
    }
  }

  return overlaps;
}

export function usePreviewMergeDetection(nodeId: string, content: string) {
  const { getNodes, getEdges, getNode } = useReactFlow<PreviewAppNode>();
  const setMergeDialogState = useSetAtom(mergeNodesDialogAtom);
  const [hasDuplicates, setHasDuplicates] = useState(false);
  const mergeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const listenersActiveRef = useRef(false);
  const stableStateRef = useRef({
    hasOverlap: false,
    lastOverlapTime: 0,
    lastDialogCloseTime: 0,
  });

  const findDuplicateNodes = useCallback((): DuplicatePointNode[] | null => {
    const allNodes = getNodes();
    const duplicates = findOverlappingPreviewNodes(allNodes, 95);
    if (!duplicates.has(nodeId)) return null;
    const nodeIds = duplicates.get(nodeId) || [];
    if (nodeIds.length === 0) return null;

    // Include the current node
    const allNodeIds = [nodeId, ...nodeIds];

    // Convert to DuplicatePointNode format
    return allNodeIds.map((nodeIdItem) => {
      const node = getNode(nodeIdItem);
      const nodeData = node?.data as PreviewPointNodeData;
      const nodeConnections = getEdges().filter(
        (edge) => edge.source === nodeIdItem
      );
      const parentIds = nodeConnections.map((conn) => {
        const parentNode = getNode(conn.target);
        const parentData = parentNode?.data as PreviewPointNodeData;
        return parentData?.existingPointId || conn.target;
      }) as (string | number)[];

      return {
        id: nodeIdItem,
        pointId: nodeData?.existingPointId || 0,
        parentIds,
      };
    });
  }, [getNodes, getEdges, getNode, nodeId]);

  const checkForDuplicates = useCallback(() => {
    const currentDuplicates = findDuplicateNodes();
    const isDup = !!currentDuplicates && currentDuplicates.length > 1;
    setHasDuplicates(isDup);
    const now = Date.now();

    if (isDup !== stableStateRef.current.hasOverlap) {
      stableStateRef.current.hasOverlap = isDup;
      if (isDup) stableStateRef.current.lastOverlapTime = now;
    }

    setMergeDialogState((state) => {
      if (isDup) {
        if (!state.isOpen) {
          return {
            isOpen: true,
            pointId: 0, // Preview nodes might not have pointId yet
            duplicateNodes: currentDuplicates!,
            onClose: () => {
              stableStateRef.current.lastDialogCloseTime = Date.now();
            },
          };
        } else if (state.duplicateNodes.some((dup) => dup.id === nodeId)) {
          // Update if this node is part of the current dialog
          return { ...state, duplicateNodes: currentDuplicates! };
        }
      } else if (
        state.isOpen &&
        state.duplicateNodes.some((dup) => dup.id === nodeId)
      ) {
        // Close if this node was part of the dialog but no longer has duplicates
        return { ...state, isOpen: false };
      }
      return state;
    });
  }, [findDuplicateNodes, nodeId, setMergeDialogState]);

  useEffect(() => {
    const onStart = () => {
      isDraggingRef.current = true;
      clearInterval(mergeCheckIntervalRef.current!);
    };
    const onEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      checkForDuplicates();
      mergeCheckIntervalRef.current = setInterval(checkForDuplicates, 1500);
    };
    const setup = () => {
      if (listenersActiveRef.current) return;
      document.addEventListener("mousedown", onStart);
      document.addEventListener("touchstart", onStart);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchend", onEnd);
      checkForDuplicates();
      mergeCheckIntervalRef.current = setInterval(checkForDuplicates, 1500);
      listenersActiveRef.current = true;
    };
    const teardown = () => {
      if (!listenersActiveRef.current) return;
      clearInterval(mergeCheckIntervalRef.current!);
      document.removeEventListener("mousedown", onStart);
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchend", onEnd);
      listenersActiveRef.current = false;
    };

    setup();
    return teardown;
  }, [checkForDuplicates, findDuplicateNodes, nodeId, setMergeDialogState]);

  return { hasDuplicates };
}
