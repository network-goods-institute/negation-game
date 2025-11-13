export {};
jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (id: string) => id,
  isValidSlugOrId: () => true,
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

describe("POST /api/experimental/rationales/[id]/updates auth gating", () => {
  beforeAll(() => {
    (process as any).env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("rejects anonymous on production with 401", async () => {
    jest.doMock("@/utils/hosts", () => ({
      isProductionRequest: () => true,
    }));
    jest.doMock("@/actions/users/getUserId", () => ({
      getUserId: jest.fn(async () => null),
    }));
    jest.doMock("@/actions/users/getUserIdOrAnonymous", () => ({
      getUserIdOrAnonymous: jest.fn(async () => "anon-1"),
    }));

    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "https://negationgame.com/api/experimental/rationales/doc-1/updates",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    const res = await POST(req as any, { params: { id: "doc-1" } });
    expect((res as any).status).toBe(401);
  });

  it("allows anonymous on non-production", async () => {
    jest.doMock("@/utils/hosts", () => ({
      isProductionRequest: () => false,
    }));
    jest.doMock("@/actions/users/getUserId", () => ({
      getUserId: jest.fn(async () => null),
    }));
    jest.doMock("@/actions/users/getUserIdOrAnonymous", () => ({
      getUserIdOrAnonymous: jest.fn(async () => "anon-2"),
    }));

    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "http://local/api/experimental/rationales/doc-1/updates",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    const res = await POST(req as any, { params: { id: "doc-1" } });
    expect((res as any).status).toBe(200);
  });
});
