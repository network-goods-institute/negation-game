import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";

/**
 * Hook that returns a function to focus/zoom to a graph node by pointId.
 * Used for Ctrl/Cmd-clicking point cards to focus the corresponding graph node.
 */
export default function useFocusNode() {
  const reactFlow = useReactFlow();

  return useCallback(
    (pointId: number) => {
      if (!reactFlow) return;

      const nodes = reactFlow.getNodes();
      const targetNode = nodes.find(
        (node) => node.type === "point" && node.data?.pointId === pointId
      );

      if (targetNode) {
        reactFlow.fitView({
          nodes: [{ id: targetNode.id }],
          duration: 800,
          padding: 0.6,
          maxZoom: 0.75,
        });
      }
    },
    [reactFlow]
  );
}
