import { buyShares } from "@/actions/market/buyShares";
import { skipIfCarrollStubbed } from "@/test/utils/skipIfCarrollStubbed";

jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "anon-u1"),
}));

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

// Minimal structure to satisfy augmentation paths without depending on LMSR
jest.mock("@/actions/market/buildStructureFromDoc", () => ({
  buildStructureFromDoc: async () => ({
    structure: { names: ["p-a"], edges: [] },
    securities: ["p-a"],
  }),
}));

// Stub market maker with deterministic cost
jest.mock("@/lib/carroll/market", () => ({
  createMarketMaker: () => ({
    setShares: () => {},
    buyShares: () => 10n,
    getPrices: () => ({ "p-a": 0.5 }),
  }),
  defaultB: 1n,
}));

const inserts: any[] = [];
const updates: any[] = [];

jest.mock("@/services/db", () => {
  const selectChain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
  };
  const tx = {
    execute: jest.fn().mockResolvedValue(undefined),
    select: jest.fn(() => selectChain),
    update: jest.fn(() => ({
      set: (vals: any) => ({ where: (_: any) => updates.push(vals) }),
    })),
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

(skipIfCarrollStubbed ? describe.skip : describe)("buyShares with anonymous user", () => {
  beforeEach(() => {
    inserts.length = 0;
    updates.length = 0;
  });

  it("persists holdings and trade rows with anon user id", async () => {
    const one = (10n ** 18n).toString();
    const res = await buyShares("doc-1", "p-a", one);
    expect(res).toEqual({ cost: "10" });

    // Expect two inserts: holdings then trades
    expect(inserts.length).toBeGreaterThanOrEqual(2);
    const holdings = inserts.find((v) => v && v.userId && v.amountScaled);
    const trade = inserts.find((v) => v && v.deltaScaled && v.costScaled);
    expect(holdings.userId).toBe("anon-u1");
    expect(trade.userId).toBe("anon-u1");
  });
});
