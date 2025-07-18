import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { AppNode } from "@/components/graph/nodes/AppNode";
import { StatementNodeData } from "@/components/graph/nodes/StatementNode";
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

  // Generate new IDs for all other nodes - simplified for better performance
  const timestamp = Date.now();
  const newNodes = graph.nodes.map((node, index) => {
    // Statement node keeps its ID
    if (node.type === "statement") {
      return { ...node, id: "statement" } as AppNode;
    }

    // Simplified ID generation for better performance
    const newId = `${node.type || "node"}_${timestamp}_${index}_${Math.random().toString(36).substring(2, 8)}`;
    idMap.set(node.id, newId);

    return {
      ...node,
      id: newId,
      data: { ...node.data },
    } as AppNode;
  });

  // Update edge source and target IDs using the mapping - simplified
  let newEdges = graph.edges.map((edge, index) => {
    const newSource = idMap.get(edge.source) || edge.source;
    const newTarget = idMap.get(edge.target) || edge.target;

    // Simplified edge ID generation
    const newId = `edge_${timestamp}_${index}_${Math.random().toString(36).substring(2, 6)}`;

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
 * Gets the current space from the URL path
 * @returns The space name or null if not found
 */
export const getSpaceFromUrl = (): string | null => {
  if (typeof window === "undefined") return null;

  const urlParts = window.location.pathname.split("/");
  const spaceIndex = urlParts.indexOf("s") + 1;

  if (
    spaceIndex <= 0 ||
    !urlParts[spaceIndex] ||
    urlParts[spaceIndex] === "null" ||
    urlParts[spaceIndex] === "undefined"
  ) {
    return null;
  }

  return urlParts[spaceIndex];
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

  // Work directly on the passed graph object or a shallow clone
  // Make a shallow clone to avoid modifying the original object outside this function, if necessary
  const workingGraph: ViewpointGraph = {
    nodes: [...graphToCopy.nodes], // Shallow clone nodes array
    edges: [...graphToCopy.edges], // Shallow clone edges array
  };

  console.log("Working graph (shallow clone):", {
    nodeCount: workingGraph.nodes.length,
    edgeCount: workingGraph.edges.length,
  });

  // Make sure we have at least one statement node
  const statementNodeIndex = workingGraph.nodes.findIndex(
    (n) => n.type === "statement"
  );

  if (statementNodeIndex >= 0) {
    console.log("Found existing statement node at index:", statementNodeIndex);
    const existingNode = workingGraph.nodes[statementNodeIndex];

    // Safely access statement property only if it's a statement node
    const currentStatement =
      existingNode.type === "statement" && existingNode.data.statement
        ? existingNode.data.statement
        : "";

    workingGraph.nodes[statementNodeIndex] = {
      ...existingNode,
      id: "statement",
      type: "statement",
      data: {
        ...existingNode.data,
        // Use type assertion for statement data
        statement: title || currentStatement || "",
      } as StatementNodeData,
    } as AppNode;
  } else {
    console.log("No statement node found, adding one");
    // Add a statement node if none exists
    workingGraph.nodes.push({
      id: "statement",
      type: "statement",
      position: { x: 0, y: 0 }, // Default position
      data: {
        statement: title || "",
      },
    } as AppNode);
  }

  // Double-check final graph before returning
  console.log("Final prepared graph:", {
    nodeCount: workingGraph.nodes.length,
    edgeCount: workingGraph.edges.length,
  });

  // Return the modified shallow clone
  return workingGraph;
};

/**
 * Creates a copy of a viewpoint graph and stores it in session storage
 * @param graphToCopy The graph to copy
 * @param title The title of the viewpoint
 * @param description The description of the viewpoint
 * @param sourceId Optional source ID for tracking copies
 * @param topic Optional topic name
 * @param topicId Optional topic ID
 * @returns true if successful
 */
export const copyViewpointToStorage = (
  graphToCopy: ViewpointGraph,
  title: string = "",
  description: string = "",
  sourceId?: string,
  topic?: string,
  topicId?: number
): boolean => {
  try {
    const preparedGraph = prepareGraphForCopy(graphToCopy, title);

    const regeneratedGraph = regenerateGraphIds(preparedGraph);

    const space = getSpaceFromUrl();
    if (!space) {
      console.error("Space is required to copy viewpoint");
      return false;
    }

    const storageKey = getCopyStorageKey(space);

    const viewpointDataToStore = {
      title: title || "",
      description: description || "",
      graph: regeneratedGraph,
      copiedFromId: sourceId,
      isCopyOperation: true,
      timestamp: Date.now(),
      ...(topic !== undefined && topic !== null && { topic }),
      ...(topicId !== undefined && topicId !== null && { topicId }),
    };

    sessionStorage.setItem(storageKey, JSON.stringify(viewpointDataToStore));
    return true;
  } catch (error) {
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
  sourceId?: string,
  autoPublish: boolean = false,
  topic?: string,
  topicId?: number
): Promise<boolean> => {
  // Before storing, log the graph for debugging
  console.log("Copying graph with nodes:", graphToCopy.nodes.length);
  console.log("[copyViewpointAndNavigate] Topic info received:", {
    topic,
    topicId,
  });

  try {
    // Use a simple fallback description for immediate copying
    // AI summary generation will happen in background after navigation
    const fallbackDescription = `Copy of the rationale "${title.trim()}". This is a copy of an existing rationale.`;

    // Store the copy in session storage with fallback description for fast navigation
    const success = copyViewpointToStorage(
      graphToCopy,
      title,
      fallbackDescription,
      sourceId,
      topic,
      topicId
    );

    if (!success) {
      console.error("Failed to store copy data");
      return false;
    }

    // Track the copy if a source ID is provided - do this in background without blocking
    if (sourceId) {
      // Fire-and-forget with very short timeout to avoid any delays
      fetch(`/api/viewpoint/track-copy?id=${sourceId}`, {
        method: "POST",
        credentials: "same-origin",
        signal: AbortSignal.timeout(1000),
      }).catch(() => {
        // Silently fail - this is non-critical telemetry
      });
    }

    // Navigate to the new page under the explicit space, optionally auto-publishing
    const space = getSpaceFromUrl();
    if (!space) {
      console.error("Space is required to navigate after copying");
      return false;
    }
    const url = `/s/${space}/rationale/new${
      autoPublish ? "?autoPublish=true" : ""
    }`;
    console.log("Navigating to new rationale page:", url);

    // Use window.location for a full page reload
    // This ensures a clean slate for the new rationale
    window.location.href = url;

    return true;
  } catch (error) {
    console.error("Error in copyViewpointAndNavigate:", error);
    return false;
  }
};
