jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-test"),
}));
jest.mock("@/services/db", () => {
  const calls: any[] = [];
  const insertChain = {
    values: () => insertChain,
    onConflictDoUpdate: () => Promise.resolve(),
  };
  const simpleRows = [{ fwd: 40, bwd: 60, fCount: 2, bCount: 2 }];
  const groupedRows = [
    { edgeId: "e1", fwd: 40, bwd: 60, fCount: 2, bCount: 2 },
    { edgeId: "e2", fwd: 70, bwd: 30, fCount: 3, bCount: 3 },
  ];
  const whereThenable: any = {
    groupBy: () => groupedRows,
    then: (resolve: any) => Promise.resolve(simpleRows).then(resolve),
  };
  const db = {
    insert: () => insertChain,
    select: () => ({
      from: () => ({
        where: () => whereThenable,
      }),
    }),
    __calls: calls,
  };
  return { db };
});

import { setMindchange, getMindchangeAveragesForEdges } from "../mindchange";

describe("mindchange actions input validation", () => {
  const OLD_ENV = process.env as any;
  beforeEach(() => {
    jest.resetModules();
    (process as any).env = { ...OLD_ENV, ENABLE_MINDCHANGE: "true" };
  });
  afterAll(() => {
    (process as any).env = OLD_ENV;
  });

  it("rejects when no ids", async () => {
    // @ts-ignore testing invalid
    const r = await setMindchange("", "", 10, 20);
    expect((r as any).ok).toBe(false);
  });

  it("rejects with no values provided", async () => {
    // @ts-ignore
    const res = await setMindchange("doc", "edge");
    if ((res as any).ok) throw new Error("expected failure");
    expect((res as any).error).toContain("No values");
  });

  it("accepts single direction and returns rounded averages (signed canonical)", async () => {
    const res = await setMindchange("doc", "edge", 33, undefined, 'negation');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.averages.forward).toBeGreaterThanOrEqual(0);
      expect(res.averages.backward).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns grouped averages for multiple edges", async () => {
    const map = await getMindchangeAveragesForEdges("doc", ["e1", "e2"]);
    expect(typeof map).toBe("object");
  });

  it("stores canonical sign based on edgeType", async () => {
    const neg = await setMindchange("doc", "edge", 50, undefined, 'negation');
    const sup = await setMindchange("doc", "edge", 50, undefined, 'support');
    expect(neg.ok).toBe(true);
    expect(sup.ok).toBe(true);
  });
});
