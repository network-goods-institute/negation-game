export {};
jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "u1"),
}));
jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "u1"),
}));
jest.mock("@/utils/hosts", () => ({
  isProductionRequest: () => false,
}));
jest.mock("@/utils/slugResolver", () => ({
  resolveSlugToId: async (id: string) => id,
  isValidSlugOrId: () => true,
}));
jest.mock("@/services/yjsCompaction", () => ({
  compactDocUpdates: jest.fn(async () => {}),
}));
jest.mock("@/services/mpAccess", () => ({
  resolveDocAccess: jest.fn(async () => ({
    status: "ok",
    docId: "doc-1",
    ownerId: "u1",
    slug: null,
    role: "owner",
    source: "owner",
  })),
  canWriteRole: jest.fn(() => true),
}));
jest.mock("@/lib/logger", () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const recordedSets: any[] = [];
const mockDb: any = {
  insert: jest.fn(() => ({ values: () => ({ onConflictDoNothing: jest.fn(async () => ({})) }) })),
  update: jest.fn(() => ({ set: (data: any) => { recordedSets.push(data); return { where: jest.fn(async () => ({})) }; } })),
  select: jest.fn(() => ({ from: () => ({ where: () => [{ count: 0 }] }) })),
  execute: jest.fn(async () => [{ title: "Untitled" }]),
};
jest.mock("@/services/db", () => ({ db: mockDb }));

describe("POST /api/experimental/rationales/[id]/updates", () => {
  beforeAll(() => {
    (process as any).env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });
  beforeEach(() => {
    recordedSets.length = 0;
    jest.clearAllMocks();
  });

  it("does not backfill mp_docs.title from Yjs updates", async () => {
    const { POST } = await import("../[id]/updates/route");
    const req: any = {
      url: "http://unit/api/experimental/rationales/doc-1/updates",
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
    const res = await POST(req as any, { params: { id: "doc-1" } });
    expect((res as any).status).toBe(200);
    expect(recordedSets.some((s) => Object.prototype.hasOwnProperty.call(s, "title"))).toBe(false);
  });
});
