import { GET as stateGET } from "@/app/api/experimental/rationales/[id]/state/route";

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-1"),
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
      execute: jest.fn(async () => [{ snapshot: Buffer.alloc(20000, 1) }]),
    },
  };
});

describe("yjs state gzip", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });

  const makeReq = (id: string) =>
    new Request(
      `https://play.negationgame.com/api/experimental/rationales/${encodeURIComponent(
        id
      )}/state`,
      { method: "GET", headers: { "accept-encoding": "gzip" } }
    );

  it("compresses large snapshots with gzip", async () => {
    const res: Response = (await stateGET(makeReq("doc-zip"), {
      params: Promise.resolve({ id: "doc-zip" }),
    } as any)) as any;
    expect((res as any).status).toBe(200);
    expect(res.headers.get("content-encoding")).toBe("gzip");
    expect(res.headers.get("x-yjs-compressed")).toBe("gzip");
    const raw = Number(res.headers.get("x-yjs-snapshot-bytes"));
    const zipped = Number(res.headers.get("x-yjs-compressed-bytes"));
    expect(raw).toBeGreaterThan(zipped);
  });
});
