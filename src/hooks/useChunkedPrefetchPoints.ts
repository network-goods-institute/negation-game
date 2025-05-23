import { useEffect } from "react";
import type { ReactFlowInstance, Node } from "@xyflow/react";
import { useUpdateNodeInternals } from "@xyflow/react";
import { usePrefetchPoint } from "@/queries/usePointData";
import type { PointNode as PointNodeType } from "@/components/graph/PointNode";

/**
 * Prefetches point data in chunks for non-hydrated graphs,
 * then updates node internals to refresh layout.
 */
export function useChunkedPrefetchPoints(
  flowInstance: ReactFlowInstance<any> | null,
  nodes: Node<any>[]
) {
  const updateNodeInternals = useUpdateNodeInternals();
  const prefetchPoint = usePrefetchPoint();

  useEffect(() => {
    if (!flowInstance) return;
    // skip if server-hydrated initial data present
    const hydrated = nodes.some(
      (n): n is PointNodeType =>
        n.type === "point" && (n.data as any).initialPointData != null
    );
    if (hydrated) return;

    const pointNodes = nodes.filter(
      (n): n is PointNodeType => n.type === "point"
    );
    const ids = Array.from(new Set(pointNodes.map((n) => n.data.pointId)));
    if (ids.length === 0) return;

    const chunkSize = 20;
    const delay = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      setTimeout(
        () => {
          chunk.forEach((id) => {
            prefetchPoint(id);
            pointNodes
              .filter((n) => n.data.pointId === id)
              .forEach((n) => updateNodeInternals(n.id));
          });
        },
        (i / chunkSize) * delay
      );
    }
  }, [flowInstance, nodes, prefetchPoint, updateNodeInternals]);
}
