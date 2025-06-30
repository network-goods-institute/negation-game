import { AppNode } from "@/components/graph/nodes/AppNode";
import { PointNode } from "@/components/graph/nodes/PointNode";
import { useNodes } from "@xyflow/react";
import { useMemo } from "react";

export const useGraphPoints = () => {
  const nodes = useNodes<AppNode>();

  const uniquePoints = useMemo(() => {
    const pointNodes = nodes.filter((node: AppNode): node is PointNode => node.type === "point");
    const seenPointIds = new Set<number>();

    return pointNodes
      .filter(node => {
        const pointId = node.data.pointId;
        if (!seenPointIds.has(pointId)) {
          seenPointIds.add(pointId);
          return true;
        }
        return false;
      })
      .map(({ data: { pointId, parentId } }) => ({ pointId, parentId }));
  }, [nodes]);

  return uniquePoints;
};
