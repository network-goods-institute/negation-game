jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "me"),
}));
import { getUserId } from "@/actions/users/getUserId";

const mockDb: any = {
  insert: jest.fn(() => ({
    values: () => ({ onConflictDoNothing: jest.fn(async () => {}) }),
  })),
  update: jest.fn(() => ({ set: () => ({ where: jest.fn(async () => {}) }) })),
  select: jest.fn(),
};

jest.mock("@/services/db", () => ({ db: mockDb }));

describe("PATCH /api/experimental/rationales/[id]", () => {
  beforeAll(() => {
    (process as any).env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });
  beforeEach(() => {
    jest.resetAllMocks();
    (getUserId as unknown as jest.Mock).mockResolvedValue("me");
    mockDb.insert.mockReturnValue({
      values: () => ({ onConflictDoNothing: jest.fn(async () => ({})) }),
    });
    mockDb.update.mockReturnValue({
      set: () => ({ where: jest.fn(async () => ({})) }),
    });
  });

  it("allows owner to rename", async () => {
    const { PATCH } = await import("../[id]/route");
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({ limit: async () => [{ ownerId: "me" }] }),
      }),
    }));
    const req = new Request("http://test", {
      method: "PATCH",
      body: JSON.stringify({ title: "New" }),
    });
    const res = await PATCH(req, { params: { id: "doc1" } });
    expect((res as any).status).toBe(200);
  });

  it("allows non-owner to rename", async () => {
    const { PATCH } = await import("../[id]/route");
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({ limit: async () => [{ ownerId: "other" }] }),
      }),
    }));
    const req = new Request("http://test", {
      method: "PATCH",
      body: JSON.stringify({ title: "New" }),
    });
    const res = await PATCH(req, { params: { id: "doc1" } });
    expect((res as any).status).toBe(200);
  });
});
