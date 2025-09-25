import {
  chooseEdgeType,
  buildConnectionEdge,
} from "@/utils/experiment/multiplayer/connectUtils";

describe("connect utils", () => {
  it("chooses option when either node is title", () => {
    expect(chooseEdgeType("title", "point")).toBe("option");
    expect(chooseEdgeType("point", "title")).toBe("option");
  });

  it("chooses option for point-to-statement connections", () => {
    expect(chooseEdgeType("point", "statement")).toBe("option");
  });

  it("chooses statement for other connections to statement", () => {
    expect(chooseEdgeType("objection", "statement")).toBe("statement");
  });

  it("defaults to negation otherwise", () => {
    expect(chooseEdgeType("point", "point")).toBe("negation");
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
