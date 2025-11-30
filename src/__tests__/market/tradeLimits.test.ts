const txMock = {
  execute: jest.fn(async () => {}),
  select: jest.fn(() => ({
    from: () => ({
      where: async () => [],
    }),
  })),
  update: jest.fn(() => ({
    set: () => ({
      where: async () => {},
    }),
  })),
  insert: jest.fn(() => ({
    values: async () => {},
  })),
};

jest.mock("@/services/db", () => ({
  db: {
    transaction: jest.fn(async (cb: any) => cb(txMock)),
  },
}));

jest.mock("@/lib/cache/nextCache", () => ({
  safeRevalidateTag: jest.fn(),
}));

jest.mock("@/db/tables/marketHoldingsTable", () => ({
  marketHoldingsTable: {
    docId: "docId",
    userId: "userId",
    securityId: "securityId",
    amountScaled: "amountScaled",
    id: "id",
  },
}));

jest.mock("@/db/tables/marketTradesTable", () => ({
  marketTradesTable: {
    docId: "docId",
    userId: "userId",
    securityId: "securityId",
    deltaScaled: "deltaScaled",
    costScaled: "costScaled",
    priceAfterScaled: "priceAfterScaled",
  },
}));

jest.mock("@/db/tables/marketStateTable", () => ({
  marketStateTable: {
    docId: "docId",
    version: "version",
    updatedAt: "updatedAt",
  },
}));

jest.mock("@/actions/market/buildStructureFromDoc", () => ({
  buildStructureFromDoc: jest.fn(async (_docId: string) => ({
    structure: { nodes: [], edges: [], names: [] },
    securities: ["edge-1"],
  })),
  buildStructureFromDocUncached: jest.fn(async (_docId: string) => ({
    structure: { nodes: [], edges: [], names: [] },
    securities: ["edge-1"],
  })),
}));

jest.mock("@/lib/carroll/structure", () => ({
  createStructure: jest.fn(
    (nodes: string[], triples: Array<[string, string, string]>) => ({
      nodes,
      edges: triples.map(([name, from, to]) => ({ name, from, to })),
      names: [],
    })
  ),
  buildSecurities: jest.fn((_structure: any) => ["edge-1"]),
}));

jest.mock("@/actions/market/structureUtils", () => ({
  createStructureWithSupports: jest.fn(
    (
      nodes: string[],
      triples: Array<[string, string, string]>,
      supports: Array<[string, string, string]>
    ) => ({
      nodes,
      edges: triples.map(([name, from, to]) => ({ name, from, to })),
      supportEdges: supports.map(([name, from, to]) => ({ name, from, to })),
      names: [],
    })
  ),
}));

const createMarketMakerMock = jest.fn(
  (_structure: any, _b: any, securities: string[]) => {
    return {
      setShares: jest.fn(() => {}),
      buyShares: jest.fn((_sec: string, delta: bigint) => 1000n + delta),
      buyAmount: jest.fn((_sec: string, spend: bigint) => ({
        shares: spend / 2n,
        cost: spend,
      })),
      getPricesFixed: jest.fn(
        () =>
          Object.fromEntries(securities.map((s) => [s, 2000n])) as Record<
            string,
            bigint
          >
      ),
      getPrices: jest.fn(
        () =>
          Object.fromEntries(securities.map((s) => [s, 0.5])) as Record<
            string,
            number
          >
      ),
    };
  }
);

jest.mock("@/lib/carroll/market", () => ({
  createMarketMaker: createMarketMakerMock,
  defaultB: 1,
}));

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: jest.fn(async (slug: string) => `resolved-${slug}`),
}));

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-1"),
}));

jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "anon-1"),
}));

jest.mock("@/actions/market/ensureSecurityInDoc", () => ({
  ensureSecurityInDoc: jest.fn(async () => {}),
}));

jest.mock("drizzle-orm", () => ({
  and: jest.fn(() => "and"),
  eq: jest.fn(() => "eq"),
  sql: ((strings: TemplateStringsArray, ...values: any[]) => ({
    strings,
    values,
  })) as any,
}));

describe("market trade caps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("allows large scaled share purchases", async () => {
    const largeDelta = (5n * 10n ** 18n).toString();
    let resultPromise: Promise<any>;

    jest.isolateModules(() => {
      const { buyShares } = require("@/actions/market/buyShares");
      resultPromise = buyShares("doc-1", "edge-1", largeDelta);
    });

    const result = await resultPromise!;
    expect(result.cost).toBe("5000000000000001000");
  });

  it("allows large scaled spend orders", async () => {
    const largeSpend = (7n * 10n ** 18n).toString();
    let resultPromise: Promise<any>;

    jest.isolateModules(() => {
      const { buyAmount } = require("@/actions/market/buyAmount");
      resultPromise = buyAmount("doc-2", "edge-1", largeSpend);
    });

    const result = await resultPromise!;
    expect(result.cost).toBe("3500000000000001000");
    expect(result.shares).toBe("3500000000000000000");
  });
});
