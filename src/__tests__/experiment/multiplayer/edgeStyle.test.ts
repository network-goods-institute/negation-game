import {
  edgeIsObjectionStyle,
  nodeIsPointLikeByIncomingNegation,
} from "@/components/experiment/multiplayer/common/edgeStyle";

describe("edgeIsObjectionStyle", () => {
  it("returns true for edge_anchor", () => {
    expect(edgeIsObjectionStyle("edge_anchor")).toBe(true);
  });

  it("returns false for point", () => {
    expect(edgeIsObjectionStyle("point")).toBe(false);
  });

  it("returns false for undefined/null", () => {
    expect(edgeIsObjectionStyle(undefined)).toBe(false);
    expect(edgeIsObjectionStyle(null as any)).toBe(false);
  });
});

describe("nodeIsPointLikeByIncomingNegation", () => {
  it("returns true if any negation edge targets the node", () => {
    const edges = [
      { id: "e1", type: "negation", source: "a", target: "b" },
      { id: "e2", type: "objection", source: "c", target: "d" },
    ];
    expect(nodeIsPointLikeByIncomingNegation("b", edges as any)).toBe(true);
  });

  it("returns false when no negation targets the node", () => {
    const edges = [{ id: "e1", type: "objection", source: "a", target: "b" }];
    expect(nodeIsPointLikeByIncomingNegation("b", edges as any)).toBe(false);
  });
});
