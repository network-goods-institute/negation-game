import { createAddPointBelow } from "@/utils/experiment/multiplayer/graphOperations";
import * as Y from "yjs";

jest.mock("sonner", () => ({
  toast: {
    warning: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("createAddPointBelow", () => {
  const buildEnv = (parent: { id: string; type: string }) => {
    const doc = new Y.Doc();
    const yNodesMap = doc.getMap<any>("nodes");
    const yEdgesMap = doc.getMap<any>("edges");
    const yTextMap = doc.getMap<Y.Text>("node_text");
    let nodes = [
      {
        id: parent.id,
        type: parent.type,
        position: { x: 0, y: 0 },
        data:
          parent.type === "statement"
            ? { statement: "Parent question" }
            : { content: "Parent point", favor: 5 },
      },
    ];
    let edges: any[] = [];

    doc.transact(() => {
      nodes.forEach((node) => yNodesMap.set(node.id, node as any));
    });

    const setNodes = (updater: (curr: any[]) => any[]) => {
      nodes = updater(nodes);
      return nodes;
    };

    const setEdges = (updater: (curr: any[]) => any[]) => {
      edges = updater(edges);
      return edges;
    };

    return {
      doc,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      setNodes,
      setEdges,
      getNodes: () => nodes,
      getEdges: () => edges,
    };
  };

  it("uses preferred support edge for point parents", () => {
    const env = buildEnv({ id: "parent", type: "point" });
    const onEdgeCreated = jest.fn();
    const addPointBelow = createAddPointBelow(
      env.getNodes(),
      env.yNodesMap,
      env.yEdgesMap,
      env.yTextMap,
      env.doc,
      true,
      {},
      { current: {} },
      env.setNodes,
      env.setEdges,
      undefined,
      undefined,
      undefined,
      {
        getPreferredEdgeType: () => "support",
        onEdgeCreated,
      }
    );

    const result = addPointBelow("parent");

    expect(result).toBeDefined();
    expect(!Array.isArray(result)).toBe(true);
    const singleResult = result as {
      nodeId: string;
      edgeId: string;
      edgeType: string;
    };
    expect(singleResult.edgeType).toBe("support");
    expect(env.getEdges()[0].type).toBe("support");
    expect(onEdgeCreated).toHaveBeenCalledWith(
      expect.objectContaining({ edgeType: "support" })
    );
  });

  it("uses preferred negation edge for point parents", () => {
    const env = buildEnv({ id: "parent", type: "point" });
    const addPointBelow = createAddPointBelow(
      env.getNodes(),
      env.yNodesMap,
      env.yEdgesMap,
      env.yTextMap,
      env.doc,
      true,
      {},
      { current: {} },
      env.setNodes,
      env.setEdges,
      undefined,
      undefined,
      undefined,
      {
        getPreferredEdgeType: () => "negation",
      }
    );

    const result = addPointBelow("parent");

    expect(result).toBeDefined();
    expect(!Array.isArray(result)).toBe(true);
    const singleResult = result as {
      nodeId: string;
      edgeId: string;
      edgeType: string;
    };
    expect(singleResult.edgeType).toBe("negation");
    expect(env.getEdges()[0].type).toBe("negation");
  });

  it("falls back to option edges for statement parents", () => {
    const env = buildEnv({ id: "parent", type: "statement" });
    const addPointBelow = createAddPointBelow(
      env.getNodes(),
      env.yNodesMap,
      env.yEdgesMap,
      env.yTextMap,
      env.doc,
      true,
      {},
      { current: {} },
      env.setNodes,
      env.setEdges,
      undefined,
      undefined,
      undefined,
      {
        getPreferredEdgeType: () => "negation",
      }
    );

    const result = addPointBelow("parent");

    expect(result).toBeDefined();
    expect(!Array.isArray(result)).toBe(true);
    const singleResult = result as {
      nodeId: string;
      edgeId: string;
      edgeType: string;
    };
    expect(singleResult.edgeType).toBe("option");
    expect(env.getEdges()[0].type).toBe("option");
  });

  it("positions new node at center when multiple parents are provided", () => {
    const doc = new Y.Doc();
    const yNodesMap = doc.getMap<any>("nodes");
    const yEdgesMap = doc.getMap<any>("edges");
    const yTextMap = doc.getMap<Y.Text>("node_text");

    const nodes = [
      {
        id: "parent1",
        type: "point",
        position: { x: 0, y: 0 },
        measured: { width: 200, height: 100 },
        data: { content: "Parent 1", favor: 5 },
      },
      {
        id: "parent2",
        type: "point",
        position: { x: 100, y: 200 },
        measured: { width: 200, height: 100 },
        data: { content: "Parent 2", favor: 5 },
      },
    ];

    let updatedNodes = [...nodes];
    let updatedEdges: any[] = [];

    const setNodes = (updater: (curr: any[]) => any[]) => {
      updatedNodes = updater(updatedNodes);
      return updatedNodes;
    };

    const setEdges = (updater: (curr: any[]) => any[]) => {
      updatedEdges = updater(updatedEdges);
      return updatedEdges;
    };

    doc.transact(() => {
      nodes.forEach((node) => yNodesMap.set(node.id, node as any));
    });

    const addPointBelow = createAddPointBelow(
      nodes,
      yNodesMap,
      yEdgesMap,
      yTextMap,
      doc,
      true,
      {},
      { current: {} },
      setNodes,
      setEdges,
      undefined,
      undefined,
      undefined,
      {
        getPreferredEdgeType: () => "support",
      }
    );

    addPointBelow(["parent1", "parent2"]);

    // Find the newly created node (should be the last one added)
    const newNode = updatedNodes[updatedNodes.length - 1];

    // Expected center position:
    // centerX = (0+200/2 + 100+200/2) / 2 = (100 + 200) / 2 = 150
    // newX = 150 - 200/2 = 50
    // lowestBottomEdge = max(0+100, 200+100) = 300
    // newY = 300 + 32 = 332
    expect(newNode.position.x).toBe(50);
    expect(newNode.position.y).toBe(332);

    // Should create edges to both parents
    expect(updatedEdges.length).toBe(2);
    expect(updatedEdges[0].target).toBe("parent1");
    expect(updatedEdges[1].target).toBe("parent2");
  });
});
