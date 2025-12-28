import { stampMissingCreator } from "@/utils/experiment/multiplayer/creatorStamp";

describe("stampMissingCreator", () => {
  it("fills missing creator metadata on nodes and edges", () => {
    const nodes: any[] = [
      { id: "n1", type: "point", data: { content: "hello" } },
      { id: "anchor:1", type: "edge_anchor", data: {} },
    ];
    const edges: any[] = [
      { id: "e1", source: "a", target: "b", data: {} },
    ];

    const result = stampMissingCreator(nodes as any, edges as any, "owner-1", "Owner");

    expect(result.changed).toBe(true);
    const stampedNode = result.nodes.find((n) => n.id === "n1") as any;
    expect(stampedNode.data.createdBy).toBe("owner-1");
    expect(stampedNode.data.createdByName).toBe("Owner");

    const stampedEdge = result.edges.find((e) => e.id === "e1") as any;
    expect(stampedEdge.data.createdBy).toBe("owner-1");
    expect(stampedEdge.data.createdByName).toBe("Owner");

    const anchorNode = result.nodes.find((n) => n.id === "anchor:1") as any;
    expect(anchorNode).toBe(nodes[1]);
  });

  it("leaves existing creator metadata untouched", () => {
    const nodes: any[] = [
      { id: "n1", type: "point", data: { createdBy: "u1", createdByName: "Alice" } },
    ];
    const edges: any[] = [
      { id: "e1", source: "a", target: "b", data: { createdBy: "u1" } },
    ];

    const result = stampMissingCreator(nodes as any, edges as any, "owner-1", "Owner");

    expect(result.changed).toBe(false);
    expect(result.nodes[0]).toBe(nodes[0]);
    expect(result.edges[0]).toBe(edges[0]);
  });
});
