import { buyShares } from "@/actions/market/buyShares";
import { buyAmount } from "@/actions/market/buyAmount";
import { skipIfCarrollStubbed } from "@/test/utils/skipIfCarrollStubbed";

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
        structure: {
          nodes: ["p-a", "p-b"],
          names: ["p-a", "p-b", "edge:p-a->p-b"],
          edges: [{ name: "edge:p-a->p-b", from: "p-a", to: "p-b" }],
          supportEdges: [],
        },
        securities: ["p-a", "p-b", "edge:p-a->p-b"],
      }
    : {
        structure: { nodes: ["p-z"], names: ["p-z"], edges: [], supportEdges: [] },
        securities: ["p-z"],
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
    buyAmount: () => ({ shares: 1n, cost: 1n }),
    getPrices: () => ({ "edge:p-a->p-b": 0.55 }),
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
  return { db: { transaction: async (fn: any) => fn(tx) } };
});

(skipIfCarrollStubbed ? describe.skip : describe)("no doc mutation for unknown edges", () => {
  beforeEach(() => {
    buildCalls = 0;
    ensureSpy.mockClear();
  });

  it("does not call ensureSecurityInDoc for unknown edge on buyShares", async () => {
    await buyShares("doc-e", "edge:p-a->p-b", (1n).toString());
    expect(ensureSpy).toHaveBeenCalledTimes(0);
  });

  it("does not call ensureSecurityInDoc for unknown edge on buyAmount", async () => {
    await buyAmount("doc-e2", "edge:p-a->p-b", (1n).toString());
    expect(ensureSpy).toHaveBeenCalledTimes(0);
  });
});
