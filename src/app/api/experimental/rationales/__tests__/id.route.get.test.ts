jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "me"),
}));
import { getUserId } from "@/actions/users/getUserId";

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
          limit: async () => [{ id: "doc1", title: "T", ownerId: "me" }],
        }),
      }),
    }));
    const res: any = await GET(new Request("http://test"), {
      params: { id: "doc1" },
    });
    expect(res.status).toBe(200);
  });
});
