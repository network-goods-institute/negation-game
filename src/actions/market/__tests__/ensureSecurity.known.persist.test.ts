import { buyShares } from "@/actions/market/buyShares";
import { buyAmount } from "@/actions/market/buyAmount";

jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "anon-tester"),
}));

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => null),
}));

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

jest.mock("@/actions/market/buildStructureFromDoc", () => ({
  buildStructureFromDoc: jest.fn(async () => ({
    structure: { names: ["p-a"], edges: [{ name: "edge:p-a->p-b", from: "p-a", to: "p-b" }] },
    securities: ["p-a", "edge:p-a->p-b"],
  })),
  buildStructureFromDocUncached: jest.fn(async () => ({
    structure: { names: ["p-a"], edges: [{ name: "edge:p-a->p-b", from: "p-a", to: "p-b" }] },
    securities: ["p-a", "edge:p-a->p-b"],
  })),
}));

const ensureSpy = jest.fn(async (_docId: string, _securityId: string) => {});
jest.mock("@/actions/market/ensureSecurityInDoc", () => ({
  ensureSecurityInDoc: (docId: string, securityId: string) => ensureSpy(docId, securityId),
}));

jest.mock("@/lib/carroll/market", () => ({
  createMarketMaker: () => ({
    setShares: () => {},
    buyShares: () => 1n,
    buyAmount: () => ({ shares: 1n, cost: 1n }),
    getPrices: () => ({ "p-a": 0.5, "edge:p-a->p-b": 0.5 }),
  }),
  defaultB: 1n,
}));

jest.mock("@/services/db", () => {
  const selectChain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
  };
  const tx = {
    execute: jest.fn().mockResolvedValue(undefined),
    select: jest.fn(() => selectChain),
    update: jest.fn(() => ({ set: jest.fn(() => ({ where: jest.fn() })) })),
    insert: jest.fn(() => ({ values: jest.fn(() => ({ returning: jest.fn(() => []) })) })),
  } as any;
  return { db: { transaction: async (fn: any) => fn(tx) } };
});

describe("ensureSecurityInDoc for known securities", () => {
  beforeEach(() => {
    ensureSpy.mockClear();
  });

  it("calls ensureSecurityInDoc for known node on buyAmount", async () => {
    await buyAmount("doc-ks", "p-a", (1n).toString());
    expect(ensureSpy).toHaveBeenCalledWith("doc-ks", "p-a");
  });

  it("calls ensureSecurityInDoc for known edge on buyShares", async () => {
    await buyShares("doc-ke", "edge:p-a->p-b", (1n).toString());
    expect(ensureSpy).toHaveBeenCalledWith("doc-ke", "edge:p-a->p-b");
  });
});

