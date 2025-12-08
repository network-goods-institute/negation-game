import { GET as stateGET } from "@/app/api/experimental/rationales/[id]/state/route";

jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "user-1"),
}));

jest.mock("@/services/mpAccess", () => ({
  resolveDocAccess: jest.fn(async (id: string) => ({
    status: "ok",
    docId: id,
    ownerId: "user-1",
    slug: null,
    role: "owner",
    source: "owner",
  })),
}));

jest.mock("@/services/db", () => {
  const chain = {
    values: () => chain,
    onConflictDoNothing: () => chain,
    set: () => chain,
    where: () => chain,
  } as any;
  return {
    db: {
      insert: () => chain,
      update: () => chain,
      execute: jest.fn(async () => [{ snapshot: Buffer.from([1, 2, 3, 4, 5]) }]),
    },
  };
});

describe("yjs state headers", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });

  const makeReq = (id: string) =>
    new Request(
      `https://play.negationgame.com/api/experimental/rationales/${encodeURIComponent(
        id
      )}/state`,
      { method: "GET" }
    );

  it("returns snapshot bytes header", async () => {
    const res: Response = (await stateGET(makeReq("doc-1"), {
      params: Promise.resolve({ id: "doc-1" }),
    } as any)) as any;
    expect((res as any).status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/octet-stream");
    expect(res.headers.get("x-yjs-snapshot-bytes")).toBe("5");
  });
});
