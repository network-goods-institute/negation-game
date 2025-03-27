import { AppNode } from "@/components/graph/AppNode";
import { PointNode } from "@/components/graph/PointNode";
import { useNodes } from "@xyflow/react";

export const useGraphPoints = () => {
  const nodes = useNodes<AppNode>();

  const pointNodes = nodes.filter((node: AppNode): node is PointNode => node.type === "point");

  const seenPointIds = new Set<number>();

  const uniquePoints = pointNodes
    .filter(node => {
      const pointId = node.data.pointId;
      if (!seenPointIds.has(pointId)) {
        seenPointIds.add(pointId);
        return true;
      }
      return false;
    })
    .map(({ data: { pointId, parentId } }) => ({ pointId, parentId }));

  return uniquePoints;
};
