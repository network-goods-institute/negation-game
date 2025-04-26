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

// Keep a record of previously detected overlapping points to prevent flickering
const overlapHistoryCache = new Map<
  string,
  {
    timestamp: number;
    wasOverlapping: boolean;
  }
>();

const OVERLAP_STABLE_TIME = 1000; // How long nodes must overlap before detecting (1 second)
const OVERLAP_COOLDOWN_TIME = 2000; // How long nodes must be separated before un-detecting (2 seconds)

/**
 * Finds nodes that are visually overlapping in the graph with strict criteria
 * to prevent flickering and false positives
 * @param nodes All nodes in the graph
 * @param overlapThreshold The distance threshold to consider nodes as overlapping (default: 60px)
 * @returns A map of pointId to array of nodeIds that have the same pointId and are overlapping
 */
export function findOverlappingPoints(
  nodes: Node[],
  overlapThreshold = 60
): Map<number, string[]> {
  const duplicates = findDuplicatePointsInGraph(nodes);
  const overlappingPoints = new Map<number, string[]>();
  const currentTime = Date.now();

  duplicates.forEach((nodeIds, pointId) => {
    if (nodeIds.length < 2) return;

    const pointCacheKey = `point-${pointId}`;
    const prevState = overlapHistoryCache.get(pointCacheKey);

    const nodePositions = nodeIds
      .map((id) => {
        const node = nodes.find((n) => n.id === id);
        return node
          ? {
              id,
              x: Math.floor(node.position.x),
              y: Math.floor(node.position.y),
              width: node.width || 200,
              height: node.height || 100,
            }
          : null;
      })
      .filter(Boolean);

    if (nodePositions.length < 2) return;

    const overlapGraph = new Map<string, Set<string>>();
    let hasAnyOverlap = false;

    nodePositions.forEach((node) => {
      if (node) {
        overlapGraph.set(node.id, new Set());
      }
    });

    for (let i = 0; i < nodePositions.length; i++) {
      const nodeA = nodePositions[i];
      if (!nodeA) continue;

      for (let j = i + 1; j < nodePositions.length; j++) {
        const nodeB = nodePositions[j];
        if (!nodeB) continue;

        const distance = Math.sqrt(
          Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2)
        );

        // Nodes must moderately overlap (at least 33%) to count as overlapping
        const boundingBoxOverlap =
          Math.abs(nodeA.x - nodeB.x) < (nodeA.width + nodeB.width) / 3 &&
          Math.abs(nodeA.y - nodeB.y) < (nodeA.height + nodeB.height) / 3;

        if (distance < overlapThreshold && boundingBoxOverlap) {
          hasAnyOverlap = true;

          overlapGraph.get(nodeA.id)?.add(nodeB.id);
          overlapGraph.get(nodeB.id)?.add(nodeA.id);
        }
      }
    }

    if (!hasAnyOverlap) {
      if (prevState && prevState.wasOverlapping) {
        overlapHistoryCache.set(pointCacheKey, {
          timestamp: currentTime,
          wasOverlapping: false,
        });
      }
      return;
    }

    const visited = new Set<string>();
    const connectedComponents: string[][] = [];

    function findConnectedNodes(nodeId: string, component: string[]) {
      visited.add(nodeId);
      component.push(nodeId);

      const neighbors = overlapGraph.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          findConnectedNodes(neighbor, component);
        }
      }
    }

    for (const nodeId of overlapGraph.keys()) {
      if (!visited.has(nodeId)) {
        const component: string[] = [];
        findConnectedNodes(nodeId, component);

        // Only include components with 2+ nodes
        if (component.length >= 2) {
          connectedComponents.push(component);
        }
      }
    }

    const largestComponent =
      connectedComponents.sort((a, b) => b.length - a.length)[0] || [];

    let finalOverlapState = false;

    if (prevState) {
      const timeInCurrentState = currentTime - prevState.timestamp;

      if (largestComponent.length >= 2) {
        // If currently overlapping, immediately mark as overlapping if previously overlapping
        // Otherwise, require stable overlap time
        finalOverlapState =
          prevState.wasOverlapping || timeInCurrentState > OVERLAP_STABLE_TIME;
      } else {
        // If not currently overlapping, maintain previous overlap state during cooldown
        finalOverlapState =
          prevState.wasOverlapping &&
          timeInCurrentState < OVERLAP_COOLDOWN_TIME;
      }
    } else {
      // First time seeing this pointId, DON'T immediately assume overlap
      // Require a full stable time period to prevent false positives on initialization
      finalOverlapState = false;
      // New entries start with current state
      overlapHistoryCache.set(pointCacheKey, {
        timestamp: currentTime,
        wasOverlapping: largestComponent.length >= 2,
      });
    }

    // Update cache if state changed
    if (
      prevState &&
      prevState.wasOverlapping !== largestComponent.length >= 2
    ) {
      overlapHistoryCache.set(pointCacheKey, {
        timestamp: currentTime,
        wasOverlapping: largestComponent.length >= 2,
      });
    }

    // Only add to results if we're in a stable overlap state
    if (finalOverlapState && largestComponent.length >= 2) {
      overlappingPoints.set(pointId, largestComponent);
    }
  });

  // Clean up old cache entries (older than 5 minutes)
  const expiredTime = currentTime - 5 * 60 * 1000;
  for (const [key, data] of overlapHistoryCache.entries()) {
    if (data.timestamp < expiredTime) {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      overlapHistoryCache.delete(key);
    }
  }

  return overlappingPoints;
}
