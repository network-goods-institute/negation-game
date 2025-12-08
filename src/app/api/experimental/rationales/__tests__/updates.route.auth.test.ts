import { NextResponse } from "next/server";

jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (id: string) => id,
  isValidSlugOrId: () => true,
}));

jest.mock("@/services/mpAccess", () => ({
  resolveDocAccess: jest.fn(async () => ({
    status: "ok",
    docId: "doc-1",
    ownerId: "user-1",
    slug: null,
    role: "owner",
    source: "owner",
  })),
  canWriteRole: jest.fn((role: string) => role === "owner" || role === "editor"),
}));

jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "user-1"),
}));

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-1"),
}));

jest.mock("@/utils/hosts", () => ({
  isProductionRequest: () => false,
}));

const mockDb: any = {
  insert: jest.fn(() => ({
    values: () => ({ onConflictDoNothing: jest.fn(async () => ({})) }),
  })),
  update: jest.fn(() => ({
    set: () => ({ where: jest.fn(async () => ({})) }),
  })),
  select: jest.fn(() => ({ from: () => ({ where: () => [{ count: 0 }] }) })),
  execute: jest.fn(async () => [{ title: "Untitled" }]),
};
jest.mock("@/services/db", () => ({ db: mockDb }));

jest.mock("@/services/yjsCompaction", () => ({
  compactDocUpdates: jest.fn(async () => ({})),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

describe("POST /api/experimental/rationales/[id]/updates auth gating", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("rejects viewers (read-only access) with 403", async () => {
    const { resolveDocAccess } = require("@/services/mpAccess");
    (resolveDocAccess as jest.Mock).mockResolvedValueOnce({
      status: "ok",
      docId: "doc-1",
      ownerId: "user-owner",
      slug: null,
      role: "viewer",
      source: "share",
    });

    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "http://local/api/experimental/rationales/doc-1/updates?share=view-token",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    const res = (await POST(req, { params: { id: "doc-1" } })) as any;
    expect(res.status).toBe(403);
  });

  it("allows owners to write updates", async () => {
    const { resolveDocAccess } = require("@/services/mpAccess");
    (resolveDocAccess as jest.Mock).mockResolvedValueOnce({
      status: "ok",
      docId: "doc-1",
      ownerId: "user-1",
      slug: null,
      role: "owner",
      source: "owner",
    });

    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "http://local/api/experimental/rationales/doc-1/updates",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    const res = (await POST(req, { params: { id: "doc-1" } })) as any;
    expect(res.status).toBe(200);
  });

  it("allows editors to write updates", async () => {
    const { resolveDocAccess } = require("@/services/mpAccess");
    (resolveDocAccess as jest.Mock).mockResolvedValueOnce({
      status: "ok",
      docId: "doc-1",
      ownerId: "user-owner",
      slug: null,
      role: "editor",
      source: "permission",
    });

    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "http://local/api/experimental/rationales/doc-1/updates",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    const res = (await POST(req, { params: { id: "doc-1" } })) as any;
    expect(res.status).toBe(200);
  });

  it("rejects when document access is forbidden", async () => {
    const { resolveDocAccess } = require("@/services/mpAccess");
    (resolveDocAccess as jest.Mock).mockResolvedValueOnce({
      status: "forbidden",
      docId: "doc-1",
      requiresAuth: true,
    });

    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "http://local/api/experimental/rationales/doc-1/updates",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    const res = (await POST(req, { params: { id: "doc-1" } })) as any;
    expect(res.status).toBe(401);
  });

  it("rejects when document is not found", async () => {
    const { resolveDocAccess } = require("@/services/mpAccess");
    (resolveDocAccess as jest.Mock).mockResolvedValueOnce({
      status: "not_found",
    });

    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "http://local/api/experimental/rationales/doc-1/updates?share=some-token",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    const res = (await POST(req, { params: { id: "doc-1" } })) as any;
    expect(res.status).toBe(404);
  });

  it("passes share token to resolveDocAccess", async () => {
    const { resolveDocAccess } = require("@/services/mpAccess");
    (resolveDocAccess as jest.Mock).mockResolvedValueOnce({
      status: "ok",
      docId: "doc-1",
      ownerId: "user-owner",
      slug: null,
      role: "editor",
      source: "share",
    });

    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "http://local/api/experimental/rationales/doc-1/updates?share=edit-token-xyz",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    const res = (await POST(req, { params: { id: "doc-1" } })) as any;
    expect(res.status).toBe(200);
    expect(resolveDocAccess).toHaveBeenCalledWith("doc-1", {
      userId: "user-1",
      shareToken: "edit-token-xyz",
    });
  });
});
