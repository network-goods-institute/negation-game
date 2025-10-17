import { createAddPointBelow } from "@/utils/experiment/multiplayer/graphOperations";
import { createDuplicateNodeWithConnections } from "@/utils/experiment/multiplayer/graphOperations/nodeDuplication";

jest.mock("sonner", () => ({ toast: { warning: jest.fn(), success: jest.fn(), error: jest.fn() } }));

describe("read-only gating for graph operations", () => {
  it("does not add a point below when canWrite is false", () => {
    const nodes: any[] = [
      { id: "p-1", type: "point", position: { x: 0, y: 0 }, data: { content: "A" } },
    ];
    const edges: any[] = [];
    const setNodes = jest.fn((updater) => {
      const next = updater(nodes);
      nodes.splice(0, nodes.length, ...next);
    });
    const setEdges = jest.fn((updater) => {
      const next = updater(edges);
      edges.splice(0, edges.length, ...next);
    });

    const addBelow = createAddPointBelow(
      nodes,
      null,
      null,
      null,
      null,
      false,
      {},
      { current: {} } as any,
      setNodes,
      setEdges,
      undefined,
      undefined,
      () => ({ x: 0, y: 0 }),
    );

    addBelow("p-1");
    expect(setNodes).not.toHaveBeenCalled();
    expect(setEdges).not.toHaveBeenCalled();
    expect(nodes.length).toBe(1);
    expect(edges.length).toBe(0);
  });

  it("does not duplicate a node when canWrite is false", () => {
    const nodes: any[] = [
      { id: "p-1", type: "point", position: { x: 0, y: 0 }, data: { content: "A" } },
    ];
    const edges: any[] = [];
    const setNodes = jest.fn((updater) => {
      const next = updater(nodes);
      nodes.splice(0, nodes.length, ...next);
    });
    const setEdges = jest.fn((updater) => {
      const next = updater(edges);
      edges.splice(0, edges.length, ...next);
    });

    const duplicate = createDuplicateNodeWithConnections(
      nodes,
      edges,
      null,
      null,
      null,
      null,
      false,
      {},
      setNodes,
      setEdges,
    );

    const res = duplicate("p-1");
    expect(res).toBeNull();
    expect(setNodes).not.toHaveBeenCalled();
    expect(setEdges).not.toHaveBeenCalled();
    expect(nodes.length).toBe(1);
  });
});

