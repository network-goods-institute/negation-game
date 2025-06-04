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
 * @returns true if successful
 */
export const copyViewpointToStorage = (
  graphToCopy: ViewpointGraph,
  title: string = "",
  description: string = "",
  sourceId?: string
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
  autoPublish: boolean = false
): Promise<boolean> => {
  // Before storing, log the graph for debugging
  console.log("Copying graph with nodes:", graphToCopy.nodes.length);

  try {
    let summaryDescription = `Copy of the rationale "${title.trim()}". This is a copy of an existing rationale.`;

    const { generateRationaleSummary } = await import(
      "@/actions/ai/generateRationaleSummary"
    );

    try {
      summaryDescription = await generateRationaleSummary({
        title,
        description,
        graph: graphToCopy,
      });
    } catch (summaryError) {
      console.error("Error generating rationale summary:", summaryError);
    }

    // Store the copy in session storage
    const success = copyViewpointToStorage(
      graphToCopy,
      title,
      summaryDescription,
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
