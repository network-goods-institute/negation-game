import { useCallback } from "react";
import type { ReactFlowInstance, Edge } from "@xyflow/react";
import type { AppNode } from "@/components/graph/nodes/AppNode";
import type { ViewpointGraph } from "@/atoms/viewpointAtoms";

interface UseGraphPaneHandlersParams {
  defaultNodes?: AppNode[];
  defaultEdges?: Edge[];
  onInitProp?: (instance: ReactFlowInstance<AppNode>) => void;
  flowInstance: ReactFlowInstance<AppNode> | null;
  setFlowInstance: (instance: ReactFlowInstance<AppNode>) => void;
  setLocalGraph?: (graph: ViewpointGraph) => void;
  setIsPanning: (panning: boolean) => void;
}

export function useGraphPaneHandlers({
  defaultNodes,
  defaultEdges,
  onInitProp,
  flowInstance,
  setFlowInstance,
  setLocalGraph,
  setIsPanning,
}: UseGraphPaneHandlersParams) {
  const handleOnInit = useCallback(
    (instance: ReactFlowInstance<AppNode>) => {
      setFlowInstance(instance);
      setTimeout(() => {
        if (defaultNodes) {
          instance.setNodes(defaultNodes);
        }
        if (defaultEdges) {
          instance.setEdges(defaultEdges);
        }
        if (onInitProp) {
          onInitProp(instance);
        }
      }, 50);
    },
    [defaultNodes, defaultEdges, onInitProp, setFlowInstance]
  );

  const handleMoveStart = useCallback(
    (event: MouseEvent | TouchEvent | null) => {
      setIsPanning(true);
    },
    [setIsPanning]
  );

  const handleMoveEnd = useCallback(
    (event: MouseEvent | TouchEvent | null) => {
      setIsPanning(false);
      if (flowInstance && setLocalGraph) {
        const { viewport, ...graph } = flowInstance.toObject();
        setLocalGraph(graph);
      }
    },
    [flowInstance, setIsPanning, setLocalGraph]
  );

  return { handleOnInit, handleMoveStart, handleMoveEnd };
}
