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

let buildCalls = 0;
const mockBuildResult = () => {
  buildCalls += 1;
  return buildCalls >= 2
    ? {
        structure: { nodes: ["p-new"], names: ["p-new"], edges: [], supportEdges: [] },
        securities: ["p-new"],
      }
    : {
        structure: { nodes: ["p-existing"], names: ["p-existing"], edges: [], supportEdges: [] },
        securities: ["p-existing"],
      };
};

jest.mock("@/actions/market/buildStructureFromDoc", () => ({
  buildStructureFromDoc: jest.fn(async () => mockBuildResult()),
  buildStructureFromDocUncached: jest.fn(async () => mockBuildResult()),
}));

const ensureSpy = jest.fn(async (_docId: string, _securityId: string) => {});
jest.mock("@/actions/market/ensureSecurityInDoc", () => ({
  ensureSecurityInDoc: (docId: string, securityId: string) =>
    ensureSpy(docId, securityId),
}));

jest.mock("@/lib/carroll/market", () => ({
  createMarketMaker: () => ({
    setShares: () => {},
    buyShares: () => 1n,
    buyAmount: () => ({ shares: 2n, cost: 5n }),
    getPrices: () => ({ "p-new": 0.5 }),
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
    insert: jest.fn(() => ({
      values: jest.fn(() => ({ returning: jest.fn(() => []) })),
    })),
  } as any;
  return {
    db: {
      transaction: async (fn: any) => fn(tx),
    },
    __getInserts: () => [],
  };
});

describe("no doc mutation for unknown nodes", () => {
  beforeEach(() => {
    buildCalls = 0;
    ensureSpy.mockClear();
  });

  it("does not call ensureSecurityInDoc for unknown node on buyShares", async () => {
    await buyShares("doc-x", "p-new", (1n).toString());
    expect(ensureSpy).toHaveBeenCalledTimes(0);
  });

  it("does not call ensureSecurityInDoc for unknown node on buyAmount", async () => {
    await buyAmount("doc-y", "p-new", (1n).toString());
    expect(ensureSpy).toHaveBeenCalledTimes(0);
  });
});
