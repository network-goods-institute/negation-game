import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { validatePointsExistence } from "@/actions/points/validatePointsExistence";

export async function validateAndCleanGraph(
  graph: ViewpointGraph
): Promise<ViewpointGraph> {
  const pointIds = graph.nodes
    .filter(
      (node) =>
        node.type === "point" &&
        node.data &&
        typeof node.data === "object" &&
        "pointId" in node.data &&
        typeof node.data.pointId === "number"
    )
    .map((node) => (node.data as any).pointId as number);

  if (pointIds.length === 0) {
    return graph;
  }

  const existingPointIds = await validatePointsExistence(pointIds);

  const directlyDeletedNodeIds = new Set(
    graph.nodes
      .filter((node) => {
        if (
          node.type !== "point" ||
          !node.data ||
          typeof node.data !== "object" ||
          !("pointId" in node.data)
        ) {
          return false;
        }

        const pointId = (node.data as any).pointId;
        return typeof pointId === "number" && !existingPointIds.has(pointId);
      })
      .map((node) => node.id)
  );

  const findChildNodes = (deletedNodeIds: Set<string>): Set<string> => {
    const childNodeIds = new Set(deletedNodeIds);
    let foundNewChildren = true;

    while (foundNewChildren) {
      foundNewChildren = false;
      for (const edge of graph.edges) {
        if (childNodeIds.has(edge.target) && !childNodeIds.has(edge.source)) {
          childNodeIds.add(edge.source);
          foundNewChildren = true;
        }
      }
    }

    return childNodeIds;
  };

  const allNodesToRemove = findChildNodes(directlyDeletedNodeIds);

  const validNodes = graph.nodes.filter(
    (node) => !allNodesToRemove.has(node.id)
  );

  const validEdges = graph.edges.filter(
    (edge) =>
      !allNodesToRemove.has(edge.source) && !allNodesToRemove.has(edge.target)
  );

  const cleanedGraph: ViewpointGraph = {
    ...graph,
    nodes: validNodes,
    edges: validEdges,
  };

  return cleanedGraph;
}
