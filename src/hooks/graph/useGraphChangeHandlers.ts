"use client";

import { useCallback, Dispatch, SetStateAction } from "react";
import type { ReactFlowInstance, NodeChange, EdgeChange } from "@xyflow/react";
import type { AppNode } from "@/components/graph/nodes/AppNode";
import type { CommentNodeData } from "@/components/graph/nodes/CommentNode";

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
      const isDragging = changes.some(
        (change) => change.type === "position" && change.dragging
      );

      if (!isDragging) {
        const hasSubstantiveChanges = changes.some((change) => {
          if (
            change.type === "add" ||
            change.type === "remove" ||
            change.type === "position"
          ) {
            return true;
          }

          if (
            "item" in change &&
            change.item &&
            typeof change.item === "object" &&
            "data" in change.item &&
            change.item.data
          ) {
            const nodeItem = change.item as AppNode;

            if (nodeItem.type === "comment") {
              const commentData = nodeItem.data as CommentNodeData;
              if (commentData._lastModified) {
                return true;
              }
              return true;
            }
          }
          return false;
        });

        if (hasSubstantiveChanges && !isNew) {
          setIsModified(true);
        }
        if (flowInstance && setLocalGraph && hasSubstantiveChanges) {
          const { viewport, ...graph } = flowInstance.toObject();
          setLocalGraph(graph);
        }
      }

      onNodesChangeDefault(changes);
      if (onNodesChangeProp) {
        onNodesChangeProp(changes);
      }
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
