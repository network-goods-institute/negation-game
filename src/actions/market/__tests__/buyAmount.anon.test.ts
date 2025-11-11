import { buyAmount } from "@/actions/market/buyAmount";

jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "anon-u2"),
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

jest.mock("@/lib/carroll/market", () => ({
  createMarketMaker: () => ({
    setShares: () => {},
    buyAmount: () => ({ shares: 2n, cost: 5n }),
    getPrices: () => ({ "p-a": 0.6 }),
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

describe("buyAmount with anonymous user", () => {
  beforeEach(() => {
    inserts.length = 0;
  });

  it("persists rows with anon user and returns cost/shares", async () => {
    const spend = (10n ** 18n).toString();
    const res = await buyAmount("doc-2", "p-a", spend);
    expect(res).toEqual({ cost: "5", shares: "2" });
    const holdings = inserts.find((v) => v && v.userId && v.amountScaled);
    const trade = inserts.find((v) => v && v.deltaScaled && v.costScaled);
    expect(holdings.userId).toBe("anon-u2");
    expect(trade.userId).toBe("anon-u2");
  });
});
