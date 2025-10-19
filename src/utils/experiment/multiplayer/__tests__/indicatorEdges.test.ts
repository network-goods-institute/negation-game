import { buildIndicatorEdges } from "@/utils/experiment/multiplayer/buildIndicatorEdges";

describe("buildIndicatorEdges", () => {
  it("creates forward/backward indicator edges with ids and directions", () => {
    const base = {
      id: "e1",
      type: "support",
      source: "a",
      target: "b",
      data: {
        mindchange: {
          forward: { average: 60, count: 2 },
          backward: { average: 20, count: 1 },
        },
      },
    } as any;
    const out = buildIndicatorEdges([base], true, new Set(["e1"]));
    expect(out.map((e) => e.id)).toEqual(
      expect.arrayContaining(["mcind:e1:forward", "mcind:e1:backward"]) 
    );
    const fwd = out.find((e) => e.id === "mcind:e1:forward") as any;
    const bwd = out.find((e) => e.id === "mcind:e1:backward") as any;
    expect(fwd.source).toBe("a");
    expect(fwd.target).toBe("b");
    expect(fwd.data.direction).toBe("forward");
    expect(fwd.data.value).toBe(-60);
    expect(bwd.source).toBe("b");
    expect(bwd.target).toBe("a");
    expect(bwd.data.direction).toBe("backward");
    expect(bwd.data.value).toBe(-20);
  });

  it("skips when feature disabled or counts are zero", () => {
    const base = {
      id: "e2",
      type: "support",
      source: "a",
      target: "b",
      data: {
        mindchange: {
          forward: { average: 0, count: 0 },
          backward: { average: 0, count: 0 },
        },
      },
    } as any;
    expect(buildIndicatorEdges([base], false, new Set(["e2"])).length).toBe(0);
    const withFeature = buildIndicatorEdges([base], true, new Set(["e2"]));
    expect(withFeature.length).toBe(0);
  });
});
