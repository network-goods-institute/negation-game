import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { AppNode } from "@/components/graph/AppNode";
import { Edge } from "@xyflow/react";

/**
 * Regenerates unique IDs for all nodes and edges in a graph
 * Used to prevent duplicate key errors when copying a rationale
 */
export const regenerateGraphIds = (graph: ViewpointGraph): ViewpointGraph => {
  // Create a mapping from old IDs to new IDs
  const idMap = new Map<string, string>();

  // Keep the statement node ID as is
  const statementNode = graph.nodes.find((node) => node.type === "statement");
  if (statementNode) {
    idMap.set(statementNode.id, "statement");
  }

  // Generate new IDs for all other nodes with increased uniqueness
  const newNodes = graph.nodes.map((node, index) => {
    // Statement node keeps its ID
    if (node.type === "statement") {
      return { ...node, id: "statement" } as AppNode;
    }

    // Generate a truly unique ID with multiple sources of randomness and index
    const timestamp = Date.now() + index; // Add index to ensure uniqueness even when created in same millisecond
    const random1 = Math.random().toString(36).substring(2, 10);
    const random2 = Math.random().toString(36).substring(2, 6);
    const newId = `${node.type || "node"}_${random1}_${timestamp}_${random2}_${index}`;

    idMap.set(node.id, newId);

    return {
      ...node,
      id: newId,
      // Preserve the pointId and other data, but ensure it's a new object reference
      data: { ...node.data },
    } as AppNode;
  });

  // Update edge source and target IDs using the mapping
  let newEdges = graph.edges.map((edge, index) => {
    const newSource = idMap.get(edge.source) || edge.source;
    const newTarget = idMap.get(edge.target) || edge.target;

    // Generate unique edge ID with index to ensure uniqueness
    const timestamp = Date.now() + Math.floor(Math.random() * 1000) + index;
    const random = Math.random().toString(36).substring(2, 10);
    const newId = `edge_${random}_${timestamp}_${index}`;

    return {
      ...edge,
      id: newId,
      source: newSource,
      target: newTarget,
    } as Edge;
  });

  // Check for and remove duplicate edges based on source-target pairs
  const edgeMap = new Map<string, Edge>();
  const duplicateEdges: string[] = [];

  newEdges.forEach((edge) => {
    const key = `${edge.source}->${edge.target}`;
    if (edgeMap.has(key)) {
      duplicateEdges.push(edge.id);
    } else {
      edgeMap.set(key, edge);
    }
  });

  if (duplicateEdges.length > 0) {
    newEdges = newEdges.filter((edge) => !duplicateEdges.includes(edge.id));
  }

  return { nodes: newNodes, edges: newEdges };
};

/**
 * Gets the current space from the URL
 * @returns The space name or 'global' if not found
 */
export const getSpaceFromUrl = (): string => {
  const urlParts = window.location.pathname.split("/");
  const spaceIndex = urlParts.indexOf("s") + 1;
  return spaceIndex > 0 && urlParts[spaceIndex]
    ? urlParts[spaceIndex]
    : "global";
};

/**
 * Creates a storage key for the given space
 */
export const getCopyStorageKey = (space: string): string => {
  return `copyingViewpoint:${space}`;
};

/**
 * Prepares a graph for copying, ensuring it has proper node structure and a statement node
 * @param graphToCopy The original graph to prepare
 * @param title The title to use for the statement node
 * @returns A prepared graph ready for copying
 */
export const prepareGraphForCopy = (
  graphToCopy: ViewpointGraph,
  title: string = ""
): ViewpointGraph => {
  console.log("Preparing graph for copy:", {
    nodeCount: graphToCopy.nodes.length,
    edgeCount: graphToCopy.edges.length,
  });

  // Make a deep clone of the graph with nodes and edges
  const clonedGraph: ViewpointGraph = {
    nodes: JSON.parse(JSON.stringify(graphToCopy.nodes)),
    edges: JSON.parse(JSON.stringify(graphToCopy.edges)),
  };

  console.log("Cloned graph:", {
    nodeCount: clonedGraph.nodes.length,
    edgeCount: clonedGraph.edges.length,
  });

  // Make sure we have at least one statement node
  let hasStatementNode = false;
  const statementNodeIndex = clonedGraph.nodes.findIndex(
    (n) => n.type === "statement"
  );

  if (statementNodeIndex >= 0) {
    console.log("Found existing statement node at index:", statementNodeIndex);
    hasStatementNode = true;

    // Ensure statement node has the proper ID and data
    const existingNode = clonedGraph.nodes[statementNodeIndex];
    clonedGraph.nodes[statementNodeIndex] = {
      ...existingNode,
      id: "statement",
      type: "statement",
      data: {
        statement: title || "",
      },
    } as AppNode;
  } else {
    console.log("No statement node found, adding one");
    // Add a statement node if none exists
    clonedGraph.nodes.push({
      id: "statement",
      type: "statement",
      position: { x: 0, y: 0 },
      data: {
        statement: title || "",
      },
    } as AppNode);
  }

  // Double-check final graph before copying
  console.log("Final prepared graph:", {
    nodeCount: clonedGraph.nodes.length,
    edgeCount: clonedGraph.edges.length,
  });

  return clonedGraph;
};

/**
 * Creates a copy of a viewpoint graph and stores it in session storage
 * @param graphToCopy The graph to copy
 * @param title The title of the viewpoint
 * @param description The description of the viewpoint
 * @param sourceId Optional source ID for tracking copies
 * @returns true if successful
 */
export const copyViewpointToStorage = (
  graphToCopy: ViewpointGraph,
  title: string = "",
  description: string = "",
  sourceId?: string
): boolean => {
  try {
    // First prepare the graph with statement node and proper structure
    const preparedGraph = prepareGraphForCopy(graphToCopy, title);

    // Then regenerate IDs to ensure uniqueness
    const regeneratedGraph = regenerateGraphIds(preparedGraph);

    // Get the current space
    const space = getSpaceFromUrl();

    // Create the copy data - ensure title doesn't get modified
    const copyData = {
      graph: regeneratedGraph,
      title: title, // Do not modify the title with "copy"
      description: description,
      sourceSpace: space,
      sourceId: sourceId, // Optional tracking ID
      isCopyOperation: true,
      copyTimestamp: Date.now(),
    };

    // Get the storage key
    const storageKey = getCopyStorageKey(space);

    // Store data in session storage
    sessionStorage.setItem(storageKey, JSON.stringify(copyData));

    console.log(
      "Stored copy data in session storage with",
      regeneratedGraph.nodes.length,
      "nodes and",
      regeneratedGraph.edges.length,
      "edges"
    );
    return true;
  } catch (error) {
    console.error("Error copying viewpoint:", error);
    return false;
  }
};

/**
 * Copies a viewpoint and navigates to the new page
 */
export const copyViewpointAndNavigate = async (
  graphToCopy: ViewpointGraph,
  title: string = "",
  description: string = "",
  sourceId?: string
): Promise<boolean> => {
  // Before storing, log the graph for debugging
  console.log("Copying graph with nodes:", graphToCopy.nodes.length);

  try {
    // Store the copy in session storage
    const success = copyViewpointToStorage(
      graphToCopy,
      title,
      description,
      sourceId
    );

    if (!success) {
      console.error("Failed to store copy data");
      return false;
    }

    // Track the copy if a source ID is provided
    // We'll do this in the background without awaiting it to avoid delays
    if (sourceId) {
      try {
        // Use fetch without await so it runs in background and doesn't block navigation
        fetch(`/api/viewpoint/track-copy?id=${sourceId}`, {
          method: "POST",
          // Add credentials to ensure cookies are sent
          credentials: "same-origin",
          // Short timeout to prevent long-running requests
          signal: AbortSignal.timeout(2000),
        }).catch((err) => {
          // This is non-critical, we can log but continue with navigation
          console.warn("Error tracking copy (non-blocking):", err);
        });
      } catch (error) {
        // Don't block navigation if tracking fails
        console.warn("Error initiating copy tracking (non-blocking):", error);
      }
    }

    // Get the space
    const space = getSpaceFromUrl();
    console.log(`Navigating to new rationale page in space: ${space}`);

    // Add a longer delay to ensure storage is properly set before navigation
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // Check one more time that the data is still in storage before navigating
      const storageKey = getCopyStorageKey(space);
      const verifyData = sessionStorage.getItem(storageKey);
      if (!verifyData) {
        console.warn(
          "Copy data missing from storage before navigation, re-saving"
        );
        copyViewpointToStorage(graphToCopy, title, description, sourceId);
      }

      // Use a more reliable navigation approach
      const newUrl = `/s/${space}/rationale/new`;
      console.log(`Navigating to: ${newUrl}`);

      // Use window.location.assign instead of href for more reliable navigation
      window.location.assign(newUrl);
      return true;
    } catch (error) {
      console.error("Error during navigation:", error);
      // Fallback navigation if there's an error
      window.location.href = `/s/global/rationale/new`;
      return false;
    }
  } catch (mainError) {
    console.error("Error in copy operation:", mainError);
    return false;
  }
};
