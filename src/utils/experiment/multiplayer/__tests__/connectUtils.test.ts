import {
  chooseEdgeType,
  buildConnectionEdge,
} from "@/utils/experiment/multiplayer/connectUtils";

describe("connect utils", () => {

  it("chooses option for any connection involving statement", () => {
    expect(chooseEdgeType("point", "statement")).toBe("option");
    expect(chooseEdgeType("statement", "point")).toBe("option");
    expect(chooseEdgeType("objection", "statement")).toBe("option");
    expect(chooseEdgeType("statement", "objection")).toBe("option");
    expect(chooseEdgeType("edge_anchor", "statement")).toBe("option");
    expect(chooseEdgeType("statement", "edge_anchor")).toBe("option");
  });

  it("gives comment priority over statement (comment edges win)", () => {
    expect(chooseEdgeType("comment", "statement")).toBe("comment");
    expect(chooseEdgeType("statement", "comment")).toBe("comment");
  });

  it("defaults to negation otherwise", () => {
    expect(chooseEdgeType("point", "point")).toBe("negation");
  });

  it("respects preferredEdgeType for point-to-point connections", () => {
    expect(chooseEdgeType("point", "point", "support")).toBe("support");
    expect(chooseEdgeType("point", "point", "negation")).toBe("negation");
  });

  it("ignores preferredEdgeType when source or target is statement", () => {
    expect(chooseEdgeType("point", "statement", "support")).toBe("option");
    expect(chooseEdgeType("statement", "point", "support")).toBe("option");
  });

  it("builds deterministic edge id with handles", () => {
    const nodes = [
      { id: "a", type: "point" },
      { id: "b", type: "statement" },
    ];
    const { id, edge, edgeType } = buildConnectionEdge(
      nodes as any,
      "b",
      "a",
      undefined,
      { userId: "user-1", username: "Alex" }
    );
    expect(edgeType).toBe("option");
    expect(id).toBe(`edge:option:a:a-source-handle->b:b-incoming-handle`);
    expect(edge.id).toBe(id);
    expect(edge.data.createdBy).toBe("user-1");
    expect(edge.data.createdByName).toBe("Alex");
  });
});
