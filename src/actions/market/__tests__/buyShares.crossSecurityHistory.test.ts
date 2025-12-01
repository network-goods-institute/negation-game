import { buyShares } from "@/actions/market/buyShares";
import { skipIfCarrollStubbed } from "@/test/utils/skipIfCarrollStubbed";

jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "u-test"),
}));

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "u-test"),
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

const mmState: any = { after: false };

jest.mock("@/lib/carroll/market", () => ({
  createMarketMaker: () => ({
    setShares: () => {},
    buyShares: () => {
      mmState.after = true;
      return 5n;
    },
    getPrices: () => ({ "p-a": 0.7, "p-b": 0.3 }),
    getPricesFixed: () =>
      mmState.after
        ? { "p-a": 700000000000000000n, "p-b": 300000000000000000n }
        : { "p-a": 600000000000000000n, "p-b": 400000000000000000n },
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

(skipIfCarrollStubbed ? describe.skip : describe)("buyShares cross-security history", () => {
  beforeEach(() => {
    inserts.length = 0;
    mmState.after = false;
  });

  it("inserts synthetic price rows for other securities", async () => {
    const delta = (1n * 10n ** 18n).toString();
    await buyShares("doc-x", "p-a", delta);
    const flat: any[] = [];
    for (const v of inserts) {
      if (Array.isArray(v)) flat.push(...v);
      else flat.push(v);
    }
    const synthetic = flat.filter((r) => r && r.securityId === "p-b" && r.deltaScaled === '0');
    expect(synthetic.length).toBeGreaterThanOrEqual(1);
  });
});

