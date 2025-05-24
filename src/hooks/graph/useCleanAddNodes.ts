import { useCallback } from "react";
import type { Edge } from "@xyflow/react";
import type { AppNode } from "@/components/graph/nodes/AppNode";

interface UseCleanAddNodesProps {
  nodes: AppNode[];
  setNodes: React.Dispatch<React.SetStateAction<AppNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export const useCleanAddNodes = ({
  nodes,
  setNodes,
  setEdges,
}: UseCleanAddNodesProps) => {
  const onPaneClick = useCallback(() => {
    window.getSelection()?.removeAllRanges();

    const staleIds = new Set(
      nodes
        .filter((node) => node.type === "addPoint")
        .filter((node) => {
          const data = node.data as { content?: string; hasContent?: boolean };
          const has =
            data.hasContent === true ||
            (typeof data.content === "string" &&
              data.content.trim().length > 0);
          return !has;
        })
        .map((node) => node.id)
    );

    if (staleIds.size === 0) {
      return;
    }

    setNodes((curr) => curr.filter((node) => !staleIds.has(node.id)));
    setEdges((curr) =>
      curr.filter(
        (edge) => !staleIds.has(edge.source) && !staleIds.has(edge.target)
      )
    );
  }, [nodes, setNodes, setEdges]);

  return onPaneClick;
};
