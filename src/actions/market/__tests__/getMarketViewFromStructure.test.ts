import { getMarketViewFromStructure } from "@/actions/market/getMarketViewFromStructure";

jest.mock("@/services/db", () => {
  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
  } as any;
  return {
    db: {
      select: jest.fn(() => chain),
      transaction: async (fn: any) => fn({ execute: async () => {}, select: () => chain }),
      execute: async () => {},
    },
  };
});

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;

describe("getMarketViewFromStructure (no holdings)", () => {
  it("prices 2 nodes + 1 edge without anchors at 3/7", async () => {
    const a = "p-a";
    const b = "p-b";
    const eid = `edge:support:${a}:${a}-source-handle->${b}:${b}-incoming-handle`;
    const view = await getMarketViewFromStructure("doc1", undefined, {
      nodes: [a, b],
      edges: [{ id: eid, source: a, target: b }],
    });
    expect(view).toBeTruthy();
    expect(Object.keys(view.prices).length).toBeGreaterThanOrEqual(3);
    expect(view.prices[a]).toBeDefined();
    expect(view.prices[b]).toBeDefined();
    expect(view.prices[eid]).toBeDefined();
    const threeSevenths = 3 / 7;
    expect(approx(view.prices[a], threeSevenths)).toBe(true);
    expect(approx(view.prices[b], threeSevenths)).toBe(true);
    expect(approx(view.prices[eid], threeSevenths)).toBe(true);
  });

  it("ignores anchor nodes and normalizes anchor endpoints", async () => {
    const a = "p-aa";
    const b = "p-bb";
    const eid = `edge:support:${a}:${a}-source-handle->${b}:${b}-incoming-handle`;
    const view = await getMarketViewFromStructure("doc2", undefined, {
      nodes: [a, b, "anchor:midpoint-x"],
      edges: [{ id: eid, source: `anchor:${a}`, target: `anchor:${b}` }],
    });
    expect(view).toBeTruthy();
    expect(view.prices[a]).toBeDefined();
    expect(view.prices[b]).toBeDefined();
    expect(view.prices[eid]).toBeDefined();
    expect(view.prices["anchor:midpoint-x"]).toBeUndefined();
  });

  it("includes all provided nodes and edges in pricing (names = 7, secs = 14 typical)", async () => {
    const n = ["n1", "n2", "n3", "n4"];
    const e1 = `edge:support:${n[0]}:${n[0]}-source-handle->${n[1]}:${n[1]}-incoming-handle`;
    const e2 = `edge:support:${n[1]}:${n[1]}-source-handle->${n[2]}:${n[2]}-incoming-handle`;
    const e3 = `edge:support:${n[2]}:${n[2]}-source-handle->${n[3]}:${n[3]}-incoming-handle`;
    const view = await getMarketViewFromStructure("doc3", undefined, {
      nodes: [...n],
      edges: [
        { id: e1, source: n[0], target: n[1] },
        { id: e2, source: n[1], target: n[2] },
        { id: e3, source: n[2], target: n[3] },
      ],
    });
    // Check that each literal we provided has a finite price
    for (const id of [...n, e1, e2, e3]) {
      expect(typeof view.prices[id]).toBe("number");
      expect(Number.isFinite(view.prices[id]!)).toBe(true);
    }
  });
});

