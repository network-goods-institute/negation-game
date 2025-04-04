import { Node } from "@xyflow/react";

/**
 * Finds all duplicate point nodes in the graph based on pointId
 * @param nodes All nodes in the graph
 * @returns A map of pointId to array of nodeIds that have that pointId
 */
export function findDuplicatePointsInGraph(
  nodes: Node[]
): Map<number, string[]> {
  const pointIdToNodeIds = new Map<number, string[]>();

  nodes.forEach((node) => {
    if (node.type === "point" && typeof node.data?.pointId === "number") {
      const pointId = node.data.pointId;
      if (!pointIdToNodeIds.has(pointId)) {
        pointIdToNodeIds.set(pointId, []);
      }
      pointIdToNodeIds.get(pointId)!.push(node.id);
    }
  });

  // Filter to only keep entries with multiple node IDs (duplicates)
  return new Map(
    [...pointIdToNodeIds.entries()].filter(([_, nodeIds]) => nodeIds.length > 1)
  );
}
