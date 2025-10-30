import {
  chooseEdgeType,
  buildConnectionEdge,
} from "@/utils/experiment/multiplayer/connectUtils";

describe("connect utils", () => {

  it("chooses option for point-to-statement connections", () => {
    expect(chooseEdgeType("point", "statement")).toBe("option");
  });

  it("uses option for any connection to statement", () => {
    expect(chooseEdgeType("objection", "statement")).toBe("option");
    expect(chooseEdgeType("edge_anchor", "statement")).toBe("option");
  });

  it("defaults to negation otherwise", () => {
    expect(chooseEdgeType("point", "point")).toBe("negation");
  });

  it("respects preferredEdgeType for point-to-point connections", () => {
    expect(chooseEdgeType("point", "point", "support")).toBe("support");
    expect(chooseEdgeType("point", "point", "negation")).toBe("negation");
  });

  it("ignores preferredEdgeType when target is statement", () => {
    expect(chooseEdgeType("point", "statement", "support")).toBe("option");
  });

  it("builds deterministic edge id with handles", () => {
    const nodes = [
      { id: "a", type: "point" },
      { id: "b", type: "statement" },
    ];
    const { id, edge, edgeType } = buildConnectionEdge(nodes as any, "b", "a");
    expect(edgeType).toBe("option");
    expect(id).toBe(`edge:option:a:a-source-handle->b:b-incoming-handle`);
    expect(edge.id).toBe(id);
  });
});
