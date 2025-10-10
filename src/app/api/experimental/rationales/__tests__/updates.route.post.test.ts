jest.mock("@/services/db", () => {
  const chain = {
    values: () => chain,
    onConflictDoNothing: () => chain,
    set: () => chain,
    where: () => chain,
    limit: () => chain,
  } as any;
  return {
    db: {
      insert: () => chain,
      update: () => chain,
      select: () => ({ from: () => ({ where: () => ({ limit: () => chain }) }) }),
      execute: jest.fn(async () => [{ title: null }]),
    },
  };
});
jest.mock("@/services/yjsCompaction", () => ({
  compactDocUpdates: jest.fn(async () => {}),
  getDocSnapshotBuffer: jest.fn(async () => null),
}));
jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => null),
}));

const getUserId = require("@/actions/users/getUserId").getUserId as jest.Mock;

describe("POST /api/experimental/rationales/[id]/updates", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("404s when experiment flag is disabled", async () => {
    (process as any).env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "false";
    const { POST } = await import("../[id]/updates/route");
    const req = new Request("http://test/", { method: "POST", body: new Uint8Array([1,2,3]) });
    const res: any = await POST(req, { params: { id: "doc1" } });
    expect(res.status).toBe(404);
  });

  it("accepts authenticated updates and returns 200", async () => {
    (process as any).env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
    getUserId.mockResolvedValueOnce("user-1");
    const db = (await import("@/services/db")).db as any;
    db.select = jest.fn(() => ({ from: () => ({ where: () => [{ count: 0 }] }) }));
    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "https://negationgame.com/api/experimental/rationales/doc1/updates",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    const res: any = await POST(req, { params: { id: "doc1" } });
    expect(res.status).toBe(200);
  });

  it("rejects unauthenticated updates in production with 401", async () => {
    (process as any).env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
    getUserId.mockResolvedValueOnce(null);
    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "https://negationgame.com/api/experimental/rationales/doc1/updates",
      arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer,
    };
    const res: any = await POST(req, { params: { id: "doc1" } });
    expect(res.status).toBe(401);
  });
});
