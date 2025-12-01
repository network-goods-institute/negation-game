import { reconcileTradableSecurities } from "@/actions/market/reconcileTradableSecurities";
import { skipIfCarrollStubbed } from "@/test/utils/skipIfCarrollStubbed";
import * as Y from "yjs";

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

const buildSupportSnapshot = () => {
  const y = new Y.Doc();
  const nodes = y.getMap<any>("nodes");
  nodes.set("A", { id: "A", type: "point" });
  nodes.set("C", { id: "C", type: "point" });
  const edges = y.getMap<any>("edges");
  edges.set("t", {
    id: "t",
    source: "C",
    target: "A",
    type: "support",
  });
  return Buffer.from(Y.encodeStateAsUpdate(y));
};

jest.mock("@/services/yjsCompaction", () => ({
  getDocSnapshotBuffer: async () => buildSupportSnapshot(),
}));

(skipIfCarrollStubbed ? describe.skip : describe)("reconcile support edges", () => {
  it("preserves support edges and securities", async () => {
    const { structure, securities } = await reconcileTradableSecurities(
      "doc-support"
    );
    expect(structure.edges).toHaveLength(0);
    expect(structure.supportEdges).toEqual([{ name: "t", from: "C", to: "A" }]);
    expect(securities).toContain("t");
  });
});
