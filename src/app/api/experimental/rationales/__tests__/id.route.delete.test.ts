jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "me"),
}));
import { getUserId } from "@/actions/users/getUserId";

const mockDb: any = {
  delete: jest.fn(() => ({ where: jest.fn(async () => {}) })),
  update: jest.fn(() => ({ set: () => ({ where: jest.fn(async () => {}) }) })),
  select: jest.fn(),
};

jest.mock("@/services/db", () => ({ db: mockDb }));

describe("DELETE /api/experimental/rationales/[id]", () => {
  beforeAll(() => {
    (process as any).env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });
  beforeEach(() => {
    jest.resetAllMocks();
    (getUserId as unknown as jest.Mock).mockResolvedValue("me");
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    mockDb.delete.mockReturnValue({ where: jest.fn(async () => ({})) });
    mockDb.update.mockReturnValue({
      set: () => ({ where: jest.fn(async () => ({})) }),
    });
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => ({ limit: async () => [{ ownerId: "me" }] }),
      }),
    });
  });

  it("allows owner to delete", async () => {
    const { DELETE } = await import("../[id]/route");
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({ limit: async () => [{ ownerId: "me" }] }),
      }),
    }));
    const res = await DELETE(new Request("http://test", { method: "DELETE" }), {
      params: { id: "doc1" },
    });
    expect((res as any).status).toBe(200);
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("forbids non-owner", async () => {
    const { DELETE } = await import("../[id]/route");
    mockDb.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({ limit: async () => [{ ownerId: "other" }] }),
      }),
    }));
    const res = await DELETE(new Request("http://test", { method: "DELETE" }), {
      params: { id: "doc1" },
    });
    expect((res as any).status).toBe(403);
  });
});
