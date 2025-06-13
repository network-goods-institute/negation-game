import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { findOverlappingPoints } from "@/lib/negation-game/findDuplicatePoints";
import {
  mergeNodesDialogAtom,
  DuplicatePointNode,
} from "@/atoms/mergeNodesAtom";

export function useMergeDetection(pointId: number) {
  const { getNodes, getEdges, getNode } = useReactFlow();
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
    const duplicates = findOverlappingPoints(allNodes, 95);
    if (!duplicates.has(pointId)) return null;
    const nodeIds = duplicates.get(pointId) || [];
    if (nodeIds.length <= 1) return null;
    return nodeIds.map((nodeId) => {
      const nodeConnections = getEdges().filter(
        (edge) => edge.source === nodeId
      );
      const parentIds = nodeConnections.map((conn) => {
        const parentNode = getNode(conn.target);
        return parentNode?.data?.pointId || conn.target;
      }) as (string | number)[];
      return { id: nodeId, pointId, parentIds };
    });
  }, [getNodes, getEdges, getNode, pointId]);

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
            pointId,
            duplicateNodes: currentDuplicates!,
            onClose: () => {
              stableStateRef.current.lastDialogCloseTime = Date.now();
            },
          };
        } else if (state.pointId === pointId) {
          return { ...state, duplicateNodes: currentDuplicates! };
        }
      } else if (state.isOpen && state.pointId === pointId) {
        return { ...state, isOpen: false };
      }
      return state;
    });
  }, [findDuplicateNodes, pointId, setMergeDialogState]);

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
  }, [checkForDuplicates, findDuplicateNodes, pointId, setMergeDialogState]);

  return { hasDuplicates };
}
