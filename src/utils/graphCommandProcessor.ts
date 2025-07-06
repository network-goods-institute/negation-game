import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { GraphCommand } from "@/types/graphCommands";
import {
  StatementNodeData,
  StatementNode,
} from "@/components/graph/nodes/StatementNode";
import { nanoid } from "nanoid";

interface CommandProcessorResult {
  updatedGraph: ViewpointGraph;
  errors: string[];
}

function validateGraphStructure(graph: ViewpointGraph): string[] {
  const errors: string[] = [];
  const statementNode = graph.nodes.find((n) => n.type === "statement");

  if (!statementNode) {
    errors.push("Graph must have a statement node");
    return errors;
  }

  const pointNodes = graph.nodes.filter((n) => n.type === "point");
  const statementEdges = graph.edges.filter(
    (e) => e.type === "statement" && e.source === statementNode.id
  );
  const statementChildIds = new Set(statementEdges.map((e) => e.target));

  for (const pointNode of pointNodes) {
    const hasIncomingEdge = graph.edges.some((e) => e.target === pointNode.id);

    if (!hasIncomingEdge) {
      errors.push(`Point "${pointNode.id}" is orphaned (no incoming edges)`);
    }

    if (!statementChildIds.has(pointNode.id)) {
      const hasNegationIncoming = graph.edges.some(
        (e) => e.target === pointNode.id && e.type === "negation"
      );

      if (!hasNegationIncoming) {
        errors.push(
          `Point "${pointNode.id}" must either be a statement child or have incoming negation edges`
        );
      }
    }
  }

  return errors;
}

export function applyGraphCommands(
  currentGraph: ViewpointGraph,
  commands: GraphCommand[]
): CommandProcessorResult {
  let updatedGraph: ViewpointGraph = {
    nodes: [...currentGraph.nodes],
    edges: [...currentGraph.edges],
  };
  const errors: string[] = [];

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    try {
      switch (command.type) {
        case "add_point":
          updatedGraph = applyAddPointCommand(updatedGraph, command);
          break;

        case "update_point":
          updatedGraph = applyUpdatePointCommand(updatedGraph, command);
          break;

        case "delete_point":
          updatedGraph = applyDeletePointCommand(updatedGraph, command);
          break;

        case "add_edge":
          updatedGraph = applyAddEdgeCommand(updatedGraph, command);
          break;

        case "update_edge":
          updatedGraph = applyUpdateEdgeCommand(updatedGraph, command);
          break;

        case "delete_edge":
          updatedGraph = applyDeleteEdgeCommand(updatedGraph, command);
          break;

        case "update_statement":
          updatedGraph = applyUpdateStatementCommand(updatedGraph, command);
          break;

        case "set_cred":
          updatedGraph = applySetCredCommand(updatedGraph, command);
          break;

        case "mark_objection":
          updatedGraph = applyMarkObjectionCommand(updatedGraph, command);
          break;

        case "unmark_objection":
          updatedGraph = applyUnmarkObjectionCommand(updatedGraph, command);
          break;

        default:
          const cmdType = (command as any).type;
          if (cmdType === "point") {
            const helpfulError = `Invalid command type "point" - use "add_point" instead`;
            console.error(helpfulError);
            errors.push(helpfulError);
          } else if (cmdType === "statement") {
            const helpfulError = `Invalid command type "statement" - use "add_edge" with edgeType: "statement"`;
            console.error(helpfulError);
            errors.push(helpfulError);
          } else if (cmdType === "negation") {
            const helpfulError = `Invalid command type "negation" - use "add_edge" with edgeType: "negation"`;
            console.error(helpfulError);
            errors.push(helpfulError);
          } else {
            console.error(`Unknown command type: ${cmdType}`);
            errors.push(`Unknown command type: ${cmdType}`);
          }
      }
    } catch (error) {
      const errorMsg = `Error applying command ${command.id} (${command.type}): ${error instanceof Error ? error.message : String(error)}`;
      console.error(`✗ Command ${i + 1} FAILED:`, errorMsg);
      console.error("Error details:", {
        commandType: command.type,
        commandId: command.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : "No stack",
      });
      console.error("Full command that failed:", command);
      errors.push(errorMsg);
    }
  }

  // Validate graph structure
  const structuralErrors = validateGraphStructure(updatedGraph);
  errors.push(...structuralErrors);

  return { updatedGraph, errors };
}

function applyAddPointCommand(
  graph: ViewpointGraph,
  command: any
): ViewpointGraph {
  console.log(
    `Adding point: nodeId=${command.nodeId}, content="${command.content}", cred=${command.cred}`
  );

  let nodeId = command.nodeId;
  const existingNode = graph.nodes.find((n) => n.id === nodeId);
  if (existingNode) {
    let counter = 1;
    do {
      nodeId = `${command.nodeId}-${counter}`;
      counter++;
    } while (graph.nodes.find((n) => n.id === nodeId));
    console.log(
      `Duplicate node ID detected, using ${nodeId} instead of ${command.nodeId}`
    );
  }

  const newNode = {
    id: nodeId,
    type: "point" as const,
    position: { x: 0, y: 0 },
    data: {
      pointId: 0,
      content: command.content,
      cred: command.cred || 0,
      isObjection: command.isObjection || false,
      objectionTargetId: command.objectionTargetId,
      objectionContextId: command.objectionContextId,
    } as any,
    draggable: true,
    selected: false,
    selectable: true,
    connectable: true,
    deletable: true,
  };

  console.log(`Successfully added node with ID: ${nodeId}`);
  return {
    ...graph,
    nodes: [...graph.nodes, newNode],
  };
}

function applyUpdatePointCommand(
  graph: ViewpointGraph,
  command: any
): ViewpointGraph {
  const targetNodeId = command.nodeId || command.id;
  const nodeIndex = graph.nodes.findIndex((n) => n.id === targetNodeId);

  if (nodeIndex === -1) {
    console.log(
      `Node ${targetNodeId} not found, converting update_point to add_point`
    );
    return applyAddPointCommand(graph, {
      id: `${targetNodeId}-add`,
      type: "add_point",
      nodeId: targetNodeId,
      content: command.content,
      cred: command.cred || 0,
    });
  }

  const node = graph.nodes[nodeIndex];
  if (node.type !== "point") {
    throw new Error(`Node ${targetNodeId} is not a point node`);
  }

  const updatedNode = {
    ...node,
    data: {
      ...node.data,
      ...(command.content !== undefined && { content: command.content }),
      ...(command.cred !== undefined && { cred: command.cred }),
    } as any,
  };

  const updatedNodes = [...graph.nodes];
  updatedNodes[nodeIndex] = updatedNode;

  return {
    ...graph,
    nodes: updatedNodes,
  };
}

function applyDeletePointCommand(
  graph: ViewpointGraph,
  command: any
): ViewpointGraph {
  const targetNodeId = command.nodeId || command.id;
  const nodeExists = graph.nodes.find((n) => n.id === targetNodeId);
  if (!nodeExists) {
    console.log(`Node ${targetNodeId} not found, skipping deletion`);
    return graph;
  }

  const updatedNodes = graph.nodes.filter((n) => n.id !== targetNodeId);

  const updatedEdges = graph.edges.filter(
    (e) => e.source !== targetNodeId && e.target !== targetNodeId
  );

  return {
    nodes: updatedNodes,
    edges: updatedEdges,
  };
}

function applyAddEdgeCommand(
  graph: ViewpointGraph,
  command: any
): ViewpointGraph {
  console.log(
    `Adding edge: edgeId=${command.edgeId}, source=${command.source}, target=${command.target}, type=${command.edgeType}`
  );

  let edgeId = command.edgeId;
  const existingEdge = graph.edges.find((e) => e.id === edgeId);
  if (existingEdge) {
    let counter = 1;
    do {
      edgeId = `${command.edgeId}-${counter}`;
      counter++;
    } while (graph.edges.find((e) => e.id === edgeId));
    console.log(
      `Duplicate edge ID detected, using ${edgeId} instead of ${command.edgeId}`
    );
  }

  const sourceNode = graph.nodes.find((n) => n.id === command.source);
  const targetNode = graph.nodes.find((n) => n.id === command.target);

  if (!sourceNode) {
    throw new Error(`Source node ${command.source} not found`);
  }
  if (!targetNode) {
    throw new Error(`Target node ${command.target} not found`);
  }

  const newEdge = {
    id: edgeId,
    source: command.source,
    target: command.target,
    type: command.edgeType,
    selected: false,
    animated: false,
    deletable: true,
    data: {},
    ...(command.edgeType === "negation"
      ? {
          sourceHandle: `${command.source}-add-handle`,
          targetHandle: `${command.target}-target`,
        }
      : {}),
  };

  console.log(`Successfully added edge with ID: ${edgeId}`);
  return {
    ...graph,
    edges: [...graph.edges, newEdge],
  };
}

function applyUpdateEdgeCommand(
  graph: ViewpointGraph,
  command: any
): ViewpointGraph {
  const targetEdgeId = command.edgeId || command.id;

  if (targetEdgeId) {
    const edgeIndex = graph.edges.findIndex((e) => e.id === targetEdgeId);
    if (edgeIndex !== -1) {
      const updatedEdge = {
        ...graph.edges[edgeIndex],
        source: command.source,
        target: command.target,
        type: command.edgeType,
        ...(command.edgeType === "negation"
          ? {
              sourceHandle: `${command.source}-add-handle`,
              targetHandle: `${command.target}-target`,
            }
          : {}),
      };

      const updatedEdges = [...graph.edges];
      updatedEdges[edgeIndex] = updatedEdge;

      console.log(`Successfully updated edge with ID: ${targetEdgeId}`);
      return {
        ...graph,
        edges: updatedEdges,
      };
    }
  }

  console.log(
    `Edge ${targetEdgeId} not found, treating update_edge as add_edge`
  );
  return applyAddEdgeCommand(graph, {
    ...command,
    type: "add_edge",
    edgeId: targetEdgeId || `edge-${nanoid()}`,
  });
}

function applyDeleteEdgeCommand(
  graph: ViewpointGraph,
  command: any
): ViewpointGraph {
  // Handle both edgeId and id for backward compatibility
  const targetEdgeId = command.edgeId || command.id;
  const edgeExists = graph.edges.find((e) => e.id === targetEdgeId);
  if (!edgeExists) {
    // Edge doesn't exist - just skip deletion gracefully
    console.log(`Edge ${targetEdgeId} not found, skipping deletion`);
    return graph;
  }

  return {
    ...graph,
    edges: graph.edges.filter((e) => e.id !== targetEdgeId),
  };
}

function applyUpdateStatementCommand(
  graph: ViewpointGraph,
  command: any
): ViewpointGraph {
  const statementNodeIndex = graph.nodes.findIndex(
    (n) => n.type === "statement"
  );
  if (statementNodeIndex === -1) {
    throw new Error("Statement node not found");
  }

  const statementNode = graph.nodes[statementNodeIndex];
  const updatedNode: StatementNode = {
    ...statementNode,
    type: "statement",
    data: {
      ...statementNode.data,
      statement: command.statement || command.title, // Handle both 'statement' and 'title' properties
    } as StatementNodeData,
  };

  const updatedNodes = [...graph.nodes];
  updatedNodes[statementNodeIndex] = updatedNode;

  return {
    ...graph,
    nodes: updatedNodes,
  };
}

function applySetCredCommand(
  graph: ViewpointGraph,
  command: any
): ViewpointGraph {
  console.log(`Setting cred: nodeId=${command.nodeId}, cred=${command.cred}`);

  const nodeIndex = graph.nodes.findIndex((n) => n.id === command.nodeId);
  if (nodeIndex === -1) {
    throw new Error(`Node with ID ${command.nodeId} not found`);
  }

  const node = graph.nodes[nodeIndex];
  if (node.type !== "point") {
    throw new Error(`Node ${command.nodeId} is not a point node`);
  }

  console.log(`Before cred update - node data:`, node.data);

  const updatedNode = {
    ...node,
    data: {
      ...node.data,
      cred: command.cred,
    } as any,
  };

  console.log(`After cred update - node data:`, updatedNode.data);

  const updatedNodes = [...graph.nodes];
  updatedNodes[nodeIndex] = updatedNode;

  return {
    ...graph,
    nodes: updatedNodes,
  };
}

function applyMarkObjectionCommand(
  graph: ViewpointGraph,
  command: any
): ViewpointGraph {
  const nodeIndex = graph.nodes.findIndex((n) => n.id === command.nodeId);
  if (nodeIndex === -1) {
    throw new Error(`Node with ID ${command.nodeId} not found`);
  }

  const node = graph.nodes[nodeIndex];
  if (node.type !== "point") {
    throw new Error(`Node ${command.nodeId} is not a point node`);
  }

  const updatedNode = {
    ...node,
    data: {
      ...node.data,
      isObjection: true,
      objectionTargetId: command.objectionTargetId,
      objectionContextId: command.objectionContextId,
    } as any,
  };

  const updatedNodes = [...graph.nodes];
  updatedNodes[nodeIndex] = updatedNode;

  return {
    ...graph,
    nodes: updatedNodes,
  };
}

function applyUnmarkObjectionCommand(
  graph: ViewpointGraph,
  command: any
): ViewpointGraph {
  const nodeIndex = graph.nodes.findIndex((n) => n.id === command.nodeId);
  if (nodeIndex === -1) {
    throw new Error(`Node with ID ${command.nodeId} not found`);
  }

  const node = graph.nodes[nodeIndex];
  if (node.type !== "point") {
    throw new Error(`Node ${command.nodeId} is not a point node`);
  }

  const updatedNode = {
    ...node,
    data: {
      ...node.data,
      isObjection: false,
      objectionTargetId: undefined,
      objectionContextId: undefined,
    } as any,
  };

  const updatedNodes = [...graph.nodes];
  updatedNodes[nodeIndex] = updatedNode;

  return {
    ...graph,
    nodes: updatedNodes,
  };
}
