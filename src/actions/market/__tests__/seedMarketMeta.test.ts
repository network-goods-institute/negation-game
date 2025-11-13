import { seedMarketMeta } from "@/actions/market/seedMarketMeta";

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

jest.mock("@/services/yjsCompaction", () => ({
  getDocSnapshotBuffer: async () => Buffer.from([]),
}));

jest.mock("@/actions/market/getMarketView", () => ({
  getMarketView: async () => ({
    prices: { "p-a": 0.42, "p-b": 0.58 },
    totals: { "p-a": "0", "p-b": "0" },
    userHoldings: {},
    updatedAt: new Date().toISOString(),
  }),
}));

const inserts: any[] = [];
jest.mock("@/services/db", () => ({
  db: {
    insert: jest.fn(() => ({
      values: (vals: any) => {
        inserts.push(vals);
        return {
          onConflictDoNothing: jest.fn(() => ({})),
        } as any;
      },
    })),
  },
}));

jest.mock("@/db/tables/mpDocsTable", () => ({ mpDocsTable: {} }));
jest.mock("@/db/tables/mpDocUpdatesTable", () => ({ mpDocUpdatesTable: {} }));

describe("seedMarketMeta", () => {
  beforeEach(() => {
    inserts.length = 0;
  });

  it("persists market meta update into mp_doc_updates", async () => {
    const res = await seedMarketMeta("doc-x");
    expect(res.ok).toBe(true);
    expect(typeof res.prices).toBe("number");
    const docInsert = inserts.find((v) => v && v.id === "doc-x");
    const updInsert = inserts.find((v) => v && v.docId === "doc-x" && v.updateBin);
    expect(docInsert).toBeTruthy();
    expect(updInsert).toBeTruthy();
  });
});


