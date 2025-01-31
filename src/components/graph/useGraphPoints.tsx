import { AppNode } from "@/components/graph/AppNode";
import { PointNode } from "@/components/graph/PointNode";
import { useNodes } from "@xyflow/react";
import { uniqueBy } from "remeda";

export const useGraphPoints = () => {
  const nodes = useNodes<AppNode>();

  const points = uniqueBy(
    nodes.filter((node: AppNode): node is PointNode => node.type === "point"),
    (n) => n.data.pointId
  ).map(({ data: { pointId, parentId } }) => ({ pointId, parentId }));

  return points;
};
