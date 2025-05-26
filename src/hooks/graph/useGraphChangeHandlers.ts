"use client";

import { useCallback, Dispatch, SetStateAction } from "react";
import type { ReactFlowInstance, NodeChange, EdgeChange } from "@xyflow/react";
import type { AppNode } from "@/components/graph/nodes/AppNode";

export interface GraphChangeHandlersParams {
  flowInstance: ReactFlowInstance<AppNode> | null;
  setLocalGraph?: (graph: any) => void;
  isNew?: boolean;
  onNodesChangeDefault: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChangeDefault: (changes: EdgeChange[]) => void;
  setIsModified: Dispatch<SetStateAction<boolean>>;
  onNodesChangeProp?: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChangeProp?: (changes: EdgeChange[]) => void;
}

export function useGraphChangeHandlers({
  flowInstance,
  setLocalGraph,
  isNew,
  onNodesChangeDefault,
  onEdgesChangeDefault,
  setIsModified,
  onNodesChangeProp,
  onEdgesChangeProp,
}: GraphChangeHandlersParams) {
  const onNodesChange = useCallback(
    (changes: NodeChange<AppNode>[]) => {
      // Skip local sync/modified flag while dragging
      const isDragging = changes.some(
        (change) => change.type === "position" && (change as any).dragging
      );
      if (!isDragging) {
        // Detect substantive changes (add/remove/data updates)
        const hasSubstantiveChanges = changes.some((change) => {
          if (change.type === "position") return true;
          if (change.type === "add" || change.type === "remove") return true;
          if ((change as any).data && (change as any).type !== "select")
            return true;
          if (
            (change as any).item?.data?._lastModified ||
            (change as any).data?._lastModified
          )
            return true;
          return false;
        });
        if (hasSubstantiveChanges && !isNew) {
          setIsModified(true);
        }
        if (flowInstance && setLocalGraph) {
          const { viewport, ...graph } = flowInstance.toObject();
          setLocalGraph(graph);
        }
      }
      // Always propagate changes for controlled nodes state
      onNodesChangeDefault(changes);
      onNodesChangeProp?.(changes);
    },
    [
      onNodesChangeDefault,
      onNodesChangeProp,
      flowInstance,
      setLocalGraph,
      isNew,
      setIsModified,
    ]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const hasSubstantiveChanges = changes.some((change) => {
        if (change.type === "add" || change.type === "remove") return true;
        if ((change as any).data) return true;
        if (change.type === "select") return false;
        return change.type === "replace";
      });

      if (hasSubstantiveChanges && !isNew) {
        setIsModified(true);
      }

      onEdgesChangeDefault(changes);
      onEdgesChangeProp?.(changes);

      if (flowInstance && setLocalGraph) {
        const { viewport, ...graph } = flowInstance.toObject();
        setLocalGraph(graph);
      }
    },
    [
      onEdgesChangeDefault,
      onEdgesChangeProp,
      flowInstance,
      setLocalGraph,
      isNew,
      setIsModified,
    ]
  );

  return { onNodesChange, onEdgesChange };
}
