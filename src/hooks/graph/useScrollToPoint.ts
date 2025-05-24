import { useCallback } from "react";
import type { Edge, Node } from "@xyflow/react";

/**
 * Hook that returns an onNodeClick handler which scrolls to the corresponding point card when Ctrl/Cmd-clicked.
 */
export default function useScrollToPoint() {
  return useCallback((event: React.MouseEvent, node: Node | Edge) => {
    if (event.ctrlKey || event.metaKey) {
      const pointId = (node as any).data?.pointId;
      if (pointId != null) {
        const el = document.getElementById(`point-card-${pointId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, []);
}
