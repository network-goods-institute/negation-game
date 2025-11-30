import { ensureSecurityInDoc } from "@/actions/market/ensureSecurityInDoc";

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (x: string) => x,
}));

jest.mock("@/services/yjsCompaction", () => ({
  getDocSnapshotBuffer: async () => Buffer.from([]),
}));

const inserts: any[] = [];
jest.mock("@/services/db", () => ({
  db: {
    insert: jest.fn(() => ({
      values: (vals: any) => {
        inserts.push(vals);
        return { onConflictDoNothing: jest.fn(() => ({})) } as any;
      },
    })),
  },
}));

jest.mock("@/db/tables/mpDocsTable", () => ({ mpDocsTable: {} }));
jest.mock("@/db/tables/mpDocUpdatesTable", () => ({ mpDocUpdatesTable: {} }));

describe("ensureSecurityInDoc", () => {
  beforeEach(() => { inserts.length = 0; });

  it("persists a node update", async () => {
    await ensureSecurityInDoc("doc-1", "p-new");
    const docInsert = inserts.find((v) => v && v.id === "doc-1");
    const updInsert = inserts.find((v) => v && v.docId === "doc-1" && v.updateBin);
    expect(docInsert).toBeTruthy();
    expect(updInsert).toBeTruthy();
  });

  it("persists an edge with endpoints", async () => {
    inserts.length = 0;
    await ensureSecurityInDoc("doc-2", "edge:p-a->p-b");
    const docInsert = inserts.find((v) => v && v.id === "doc-2");
    const updInsert = inserts.find((v) => v && v.docId === "doc-2" && v.updateBin);
    expect(docInsert).toBeTruthy();
    expect(updInsert).toBeTruthy();
  });
});
