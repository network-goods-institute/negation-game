import { buyAmount } from "@/actions/market/buyAmount";

jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "u-test"),
}));

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

jest.mock("@/actions/market/buildStructureFromDoc", () => ({
  buildStructureFromDoc: async () => ({
    structure: { names: ["p-a", "p-b"], edges: [] },
    securities: ["p-a", "p-b"],
  }),
}));

// Mock MM to produce tiny price change below epsilon for p-b, and a real trade on p-a
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
    getPricesFixed: () =>
      mmState.after
        ? { "p-a": 700000000000000000n, "p-b": 500000000000000100n } // p-b changed by 1e-16 (< 1e-6 eps)
        : { "p-a": 600000000000000000n, "p-b": 500000000000000000n },
    getPrices: () => ({ "p-a": 0.7, "p-b": 0.5 }),
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

describe("synthetic rows reflect any price change", () => {
  beforeEach(() => {
    inserts.length = 0;
    mmState.after = false;
  });

  it("persists synthetic rows for tiny price changes", async () => {
    const spend = (10n ** 18n).toString();
    await buyAmount("doc-x", "p-a", spend);
    const flat: any[] = [];
    for (const v of inserts) {
      if (Array.isArray(v)) flat.push(...v);
      else flat.push(v);
    }
    // One main trade row for p-a
    const main = flat.filter((r) => r && r.securityId === "p-a" && r.deltaScaled && r.deltaScaled !== "0");
    expect(main.length).toBeGreaterThanOrEqual(1);
    // Synthetic rows present for p-b despite tiny change
    const synthetic = flat.filter((r) => r && r.securityId === "p-b" && r.deltaScaled === "0");
    expect(synthetic.length).toBeGreaterThanOrEqual(1);
  });
});
