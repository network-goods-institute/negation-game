import { NextResponse } from "next/server";

jest.mock("@/services/mpAccess", () => ({
  resolveDocAccess: jest.fn(async () => ({
    status: "ok",
    docId: "doc-1",
    ownerId: "user-1",
    slug: null,
    role: "owner",
    source: "owner",
  })),
}));

jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "user-1"),
}));

const mockExecute = jest.fn();
jest.mock("@/services/db", () => ({
  db: { execute: (...args: any[]) => mockExecute(...args) },
}));

jest.mock("@/services/yjsCompaction", () => ({
  getDocSnapshotBuffer: jest.fn(async () => Buffer.from("abc")),
  getDocSnapshotBase64: jest.fn(async () => "YWJj"),
}));

describe("GET /api/experimental/rationales/[id]/state auth gating", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("rejects when access is forbidden", async () => {
    const { resolveDocAccess } = require("@/services/mpAccess");
    (resolveDocAccess as jest.Mock).mockResolvedValueOnce({
      status: "forbidden",
      docId: "doc-1",
      requiresAuth: true,
    });
    const { GET } = await import("../[id]/state/route");
    const res = (await GET(
      new Request("https://negationgame.com/api/experimental/rationales/doc-1/state"),
      { params: { id: "doc-1" } }
    )) as NextResponse;
    expect(res.status).toBe(401);
  });

  it("serves snapshot when access granted and passes share token", async () => {
    mockExecute.mockResolvedValueOnce([{ snapshot: null }]).mockResolvedValueOnce([{ snapshot_at: null }]);
    const { resolveDocAccess } = require("@/services/mpAccess");
    const { GET } = await import("../[id]/state/route");
    const res = (await GET(
      new Request("https://negationgame.com/api/experimental/rationales/doc-1/state?share=token-xyz"),
      { params: { id: "doc-1" } }
    )) as Response;
    expect(res.status).toBe(200);
    expect(resolveDocAccess).toHaveBeenCalledWith("doc-1", {
      userId: "user-1",
      shareToken: "token-xyz",
    });
  });
});
