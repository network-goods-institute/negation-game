import { getMarketView } from "@/actions/market/getMarketView";
import { skipIfCarrollStubbed } from "@/test/utils/skipIfCarrollStubbed";

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

// Build a Yjs snapshot containing an edge without explicit node entries
import * as Y from "yjs";
const buildEdgeOnlySnapshot = () => {
  const y = new Y.Doc();
  const edges = y.getMap<any>("edges");
  edges.set("edge:p-a->p-b", {
    id: "edge:p-a->p-b",
    source: "p-a",
    target: "p-b",
    type: "support",
  });
  const update = Y.encodeStateAsUpdate(y);
  return Buffer.from(update);
};

jest.mock("@/services/yjsCompaction", () => ({
  getDocSnapshotBuffer: async () => buildEdgeOnlySnapshot(),
}));

const ensureSpy = jest.fn(async (_docId: string, _securityId: string) => {});
jest.mock("@/actions/market/ensureSecurityInDoc", () => ({
  ensureSecurityInDoc: (docId: string, securityId: string) =>
    ensureSpy(docId, securityId),
}));

jest.mock("@/services/db", () => {
  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
  } as any;
  return { db: { select: jest.fn(() => chain) } };
});

jest.mock("@/lib/carroll/market", () => ({
  createMarketMaker: () => ({
    setShares: () => {},
    getPrices: () => ({ "p-a": 0.5, "p-b": 0.5, "edge:p-a->p-b": 0.5 }),
  }),
  defaultB: 1n,
}));

(skipIfCarrollStubbed ? describe.skip : describe)("reconcile tradability on market view fetch", () => {
  beforeEach(() => ensureSpy.mockClear());

  it("does not persist missing endpoints but still prices the edge", async () => {
    const view = await getMarketView("doc-r1");
    expect(view.prices["edge:p-a->p-b"]).toBeDefined();
    expect(ensureSpy).not.toHaveBeenCalled();
  });
});
