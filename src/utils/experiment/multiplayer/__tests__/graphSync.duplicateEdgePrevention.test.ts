import { createGraphChangeHandlers } from "@/utils/experiment/multiplayer/graphSync";

describe("graphSync duplicate edge prevention", () => {
  it("prevents adding a duplicate edge for the same node pair (same direction)", () => {
    let edges: any[] = [{ id: "edge:support:a:a->b:b", source: "a", target: "b", type: "support" }];
    const setEdges = (updater: any) => { edges = updater(edges); };

    const { onConnect } = createGraphChangeHandlers(
      () => {},
      setEdges as any,
      null as any,
      null as any,
      null as any,
      jest.fn(),
      {},
      () => [{ id: "a", type: "point" }, { id: "b", type: "point" }] as any,
      () => "support",
      false
    );

    onConnect({ source: "a", target: "b", sourceHandle: "a", targetHandle: "b" });
    expect(edges).toHaveLength(1);
  });

  it("prevents adding a duplicate edge for the same node pair (opposite direction)", () => {
    let edges: any[] = [{ id: "edge:support:a:a->b:b", source: "a", target: "b", type: "support" }];
    const setEdges = (updater: any) => { edges = updater(edges); };

    const { onConnect } = createGraphChangeHandlers(
      () => {},
      setEdges as any,
      null as any,
      null as any,
      null as any,
      jest.fn(),
      {},
      () => [{ id: "a", type: "point" }, { id: "b", type: "point" }] as any,
      () => "support",
      false
    );

    onConnect({ source: "b", target: "a", sourceHandle: "b", targetHandle: "a" });
    expect(edges).toHaveLength(1);
  });
});

