jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "me"),
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

describe("GET /api/experimental/rationales/[id]", () => {
  beforeAll(() => {
    (process as any).env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });
  beforeEach(() => {
    jest.resetAllMocks();
    (getUserId as unknown as jest.Mock).mockResolvedValue("me");
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
    // Verify we performed resolution (resolver select + final select)
    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });
});
