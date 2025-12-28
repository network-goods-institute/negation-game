import { createAddPointBelow } from "@/utils/experiment/multiplayer/graphOperations/nodeCreation";

describe("createAddPointBelow creator metadata", () => {
  it("stamps creator info on new nodes and edges", () => {
    const nodes: any[] = [
      {
        id: "p1",
        type: "point",
        position: { x: 0, y: 0 },
        data: { content: "parent" },
      },
    ];
    const setNodes = jest.fn();
    const setEdges = jest.fn();

    const addPointBelow = createAddPointBelow(
      nodes,
      null,
      null,
      null,
      null,
      true,
      {},
      { current: {} } as any,
      setNodes,
      setEdges,
      undefined,
      undefined,
      undefined,
      { userId: "user-1", username: "alice" },
      { onEdgeCreated: jest.fn() }
    );

    addPointBelow("p1");

    expect(setNodes).toHaveBeenCalledTimes(1);
    const nodesUpdater = setNodes.mock.calls[0][0];
    const nextNodes = nodesUpdater(nodes);
    const newNode = nextNodes.find((n: any) => n.id !== "p1");
    expect(newNode?.data?.createdBy).toBe("user-1");
    expect(newNode?.data?.createdByName).toBe("alice");

    expect(setEdges).toHaveBeenCalledTimes(1);
    const edgesUpdater = setEdges.mock.calls[0][0];
    const nextEdges = edgesUpdater([]);
    const newEdge = nextEdges.find((e: any) => e.source === newNode?.id);
    expect(newEdge?.data?.createdBy).toBe("user-1");
    expect(newEdge?.data?.createdByName).toBe("alice");
  });
});
