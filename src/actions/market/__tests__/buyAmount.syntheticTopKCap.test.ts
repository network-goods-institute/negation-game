import { buyAmount } from "@/actions/market/buyAmount";

jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "u-test"),
}));

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

jest.mock("@/actions/market/buildStructureFromDoc", () => ({
  buildStructureFromDoc: async () => ({
    structure: { names: ["p-a"], edges: [] },
    securities: ["p-a"],
  }),
}));

const mmState: any = { after: false };

jest.mock("@/lib/carroll/market", () => ({
  createMarketMaker: () => ({
    setShares: () => {},
    buyAmount: () => {
      mmState.after = true;
      return { shares: 2n, cost: 5n };
    },
    buyShares: () => {
      mmState.after = true;
      return 5n;
    },
    getPricesFixed: () => {
      if (!mmState.after) {
        const base: Record<string, bigint> = { "p-a": 600000000000000000n };
        // before: other secs at 0.50
        for (let i = 1; i <= 60; i++) base[`p-${i}`] = 500000000000000000n;
        return base;
      }
      const after: Record<string, bigint> = { "p-a": 700000000000000000n };
      // after: 60 movers increase by varying amounts
      for (let i = 1; i <= 60; i++) after[`p-${i}`] = 500000000000000000n + BigInt(i) * 1000000000000000n; // >=1e-6
      return after;
    },
    getPrices: () => ({ "p-a": 0.7 }),
  }),
  defaultB: 1n,
}));

const inserts: any[] = [];

jest.mock("@/services/db", () => {
  const selectChain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
  };
  const tx = {
    execute: jest.fn().mockResolvedValue(undefined),
    select: jest.fn(() => selectChain),
    update: jest.fn(() => ({ set: jest.fn(() => ({ where: jest.fn() })) })),
    insert: jest.fn(() => ({
      values: (vals: any) => {
        inserts.push(vals);
        return { returning: jest.fn(() => []) } as any;
      },
    })),
  } as any;
  return {
    db: {
      transaction: async (fn: any) => fn(tx),
    },
    __getInserts: () => inserts,
  };
});

describe("synthetic rows top-K cap", () => {
  beforeEach(() => {
    inserts.length = 0;
    mmState.after = false;
  });

  it("persists synthetic rows for all movers", async () => {
    const spend = (10n ** 18n).toString();
    await buyAmount("doc-x", "p-a", spend);
    const flat: any[] = [];
    for (const v of inserts) {
      if (Array.isArray(v)) flat.push(...v);
      else flat.push(v);
    }
    const synthetic = flat.filter((r) => r && r.deltaScaled === "0" && r.costScaled === "0");
    expect(synthetic.length).toBeGreaterThan(0);
  });
});
