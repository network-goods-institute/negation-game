"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { useReactFlow } from "@xyflow/react";
import {
  undoCollapseStackAtom,
  collapsedPointIdsAtom,
  collapsedNodePositionsAtom,
} from "@/atoms/viewpointAtoms";
import type { PointNodeData } from "@/components/graph/PointNode";

export function useCollapseUndo() {
  const { addNodes, addEdges } = useReactFlow();
  const [undoStack, setUndoStack] = useAtom(undoCollapseStackAtom);
  const [, setCollapsedPointIds] = useAtom(collapsedPointIdsAtom);
  const [, setCollapsedPositions] = useAtom(collapsedNodePositionsAtom);

  useEffect(() => {
    let isProcessingUndo = false;
    let undoTimeoutRef: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        if (isProcessingUndo || undoStack.length === 0) {
          return;
        }

        event.preventDefault();
        isProcessingUndo = true;
        if (undoTimeoutRef) clearTimeout(undoTimeoutRef);

        setUndoStack((prev) => {
          const newStack = [...prev];
          const lastState = newStack.pop()!;

          addNodes(lastState.nodesToRestore);
          addEdges(lastState.edgesToRestore);

          const restoredPointIds = lastState.nodesToRestore
            .filter((node) => node.type === "point")
            .map((node) => (node.data as PointNodeData).pointId);

          setCollapsedPointIds((prev) => {
            const newSet = new Set(prev);
            // eslint-disable-next-line drizzle/enforce-delete-with-where
            restoredPointIds.forEach((id) => newSet.delete(id));
            return newSet;
          });

          setCollapsedPositions((prev) =>
            prev.filter((pos) => !restoredPointIds.includes(pos.pointId))
          );

          undoTimeoutRef = setTimeout(() => {
            isProcessingUndo = false;
          }, 300);

          return newStack;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (undoTimeoutRef) clearTimeout(undoTimeoutRef);
    };
  }, [
    addNodes,
    addEdges,
    setUndoStack,
    setCollapsedPointIds,
    setCollapsedPositions,
    undoStack,
  ]);
}
