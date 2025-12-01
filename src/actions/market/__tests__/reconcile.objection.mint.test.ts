import { getMarketView } from "@/actions/market/getMarketView";
import { skipIfCarrollStubbed } from "@/test/utils/skipIfCarrollStubbed";
import * as Y from "yjs";

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

const buildSnapshotWithObjection = () => {
  const y = new Y.Doc();
  const nodes = y.getMap<any>("nodes");
  nodes.set("p-a", { id: "p-a", type: "point" });
  nodes.set("p-b", { id: "p-b", type: "point" });
  nodes.set("obj-1", { id: "obj-1", type: "objection" });

  const edges = y.getMap<any>("edges");
  edges.set("edge:p-a->p-b", {
    id: "edge:p-a->p-b",
    source: "p-a",
    target: "p-b",
    type: "support",
  });
  edges.set("obj-edge", {
    id: "obj-edge",
    source: "obj-1",
    target: "anchor:edge:p-a->p-b",
    type: "objection",
  });
  return Buffer.from(Y.encodeStateAsUpdate(y));
};

jest.mock("@/services/yjsCompaction", () => ({
  getDocSnapshotBuffer: async () => buildSnapshotWithObjection(),
}));

jest.mock("@/services/db", () => {
  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
  } as any;
  return { db: { select: jest.fn(() => chain) } };
});

const capturedSecs: string[] = [];
jest.mock("@/lib/carroll/market", () => ({
  createMarketMaker: (_s: any, _b: any, secs: string[]) => {
    capturedSecs.splice(0, capturedSecs.length, ...secs);
    return {
      setShares: () => {},
      getPrices: () =>
        Object.fromEntries(secs.map((id) => [id, 0.5] as const)),
    };
  },
  defaultB: 1n,
}));

(skipIfCarrollStubbed ? describe.skip : describe)("reconcile tradability for objection edges", () => {
  beforeEach(() => {
    capturedSecs.splice(0, capturedSecs.length);
  });

  it("mints securities for objections using their own ids", async () => {
    const view = await getMarketView("doc-objection");
    expect(capturedSecs).toContain("obj-edge");
    expect(view.prices["obj-edge"]).toBeDefined();
    expect(view.prices["edge:p-a->p-b"]).toBeDefined();
  });
});
