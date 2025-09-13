jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "me"),
}));
import { getUserId } from "@/actions/users/getUserId";

const mockDb: any = { execute: jest.fn() };
jest.mock("@/services/db", () => ({ db: mockDb }));

describe("GET /api/experimental/rationales", () => {
  beforeAll(() => {
    (process as any).env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });
  beforeEach(() => {
    jest.resetAllMocks();
    (getUserId as unknown as jest.Mock).mockResolvedValue("me");
  });

  it("returns docs for owner or accessed", async () => {
    const { GET } = await import("../route");
    mockDb.execute.mockResolvedValueOnce([
      {
        id: "a",
        title: "Mine",
        ownerId: "me",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOpenAt: new Date(),
      },
    ]);
    const res: any = await GET();
    expect(res.status).toBe(200);
  });
});
