jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "me"),
}));
jest.mock("@/services/mpAccess", () => ({
  resolveDocAccess: jest.fn(async (_id: string) => ({
    status: "ok",
    docId: _id,
    ownerId: "me",
    slug: "s",
    role: "owner",
    source: "owner",
  })),
  canWriteRole: () => true,
}));
import { getUserId } from "@/actions/users/getUserId";

// Mock NextResponse to return a simple object with json() and status
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

const mockDb: any = {
  select: jest.fn(),
};

jest.mock("@/services/db", () => ({ db: mockDb }));
const { resolveDocAccess } = require("@/services/mpAccess");

describe("GET /api/experimental/rationales/[id]", () => {
  beforeAll(() => {
    (process as any).env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserId as unknown as jest.Mock).mockResolvedValue("me");
    (resolveDocAccess as jest.Mock).mockImplementation(async (id: string) => ({
      status: id === "non-existent-id" ? "not_found" : "ok",
      docId: id,
      ownerId: "me",
      slug: "s",
      role: "owner",
      source: "owner",
    }));
  });

  it("returns doc with title and ownerId", async () => {
    const { GET } = await import("../[id]/route");
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { id: "doc1", title: "T", ownerId: "me", slug: "t" },
          ],
        }),
      }),
    }));
    const res: any = await GET(new Request("http://test"), {
      params: { id: "doc1" },
    });
    expect(res.status).toBe(200);
  });

  it("resolves combined slug_id by id and returns doc", async () => {
    const { GET } = await import("../[id]/route");
    const makeChain = (rows: any[]) => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    });
    // First select: resolver finds canonical id by candidate id m-123
    (mockDb.select as jest.Mock)
      .mockImplementationOnce(() => makeChain([{ id: "m-123" }]))
      // Second select: route fetches doc by id
      .mockImplementationOnce(() =>
        makeChain([{ id: "m-123", title: "T", ownerId: "me", slug: "NewSlug" }])
      );

    const res: any = await GET(new Request("http://test"), {
      params: { id: "OldSlug_m-123" },
    });
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when document does not exist", async () => {
    const { GET } = await import("../[id]/route");
    const makeChain = (rows: any[]) => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    });
    // First select: resolveSlugToId returns empty (not found)
    // Second select: route handler returns empty (not found)
    (mockDb.select as jest.Mock)
      .mockImplementationOnce(() => makeChain([]))
      .mockImplementationOnce(() => makeChain([]));

    const res: any = await GET(new Request("http://test"), {
      params: { id: "non-existent-id" },
    });
    expect(res.status).toBe(404);
  });
});
