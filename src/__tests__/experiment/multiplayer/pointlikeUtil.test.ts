import { nodeIsPointLikeByIncomingNegation } from "@/components/experiment/multiplayer/common/edgeStyle";

describe("nodeIsPointLikeByIncomingNegation (incoming and outgoing parity via code)", () => {
  it("detects incoming negation", () => {
    const edges = [
      { id: "e1", type: "negation", source: "a", target: "n" },
      { id: "e2", type: "objection", source: "b", target: "c" },
    ] as any;
    expect(nodeIsPointLikeByIncomingNegation("n", edges)).toBe(true);
    expect(nodeIsPointLikeByIncomingNegation("a", edges)).toBe(false);
  });
});
