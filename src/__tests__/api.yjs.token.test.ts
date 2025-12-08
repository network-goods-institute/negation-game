import { POST as tokenPOST } from "@/app/api/yjs/token/route";

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-1"),
}));
jest.mock("@/actions/users/getUserIdOrAnonymous", () => ({
  getUserIdOrAnonymous: jest.fn(async () => "anon-123"),
}));
jest.mock("@/services/mpAccess", () => ({
  resolveDocAccess: jest.fn(async () => ({
    status: "ok",
    docId: "doc-1",
    ownerId: "user-1",
    slug: null,
    role: "editor",
    source: "owner",
  })),
  canWriteRole: jest.fn(() => true),
}));

describe("yjs token endpoint", () => {
  const getUserId = require("@/actions/users/getUserId").getUserId as jest.Mock;
  const mockResolve = require("@/services/mpAccess").resolveDocAccess as jest.Mock;

  beforeEach(() => {
    mockResolve.mockResolvedValue({
      status: "ok",
      docId: "doc-1",
      ownerId: "user-1",
      slug: null,
      role: "editor",
      source: "owner",
    });
  });

  const withEnv = (env: Record<string, string | undefined>, fn: () => Promise<void>) => {
    const prev: Record<string, string | undefined> = {};
    for (const k of Object.keys(env)) prev[k] = process.env[k];
    Object.assign(process.env, env);
    return fn().finally(() => {
      for (const k of Object.keys(env)) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    });
  };

  it("404s when experiment flag is disabled", async () => {
    await withEnv({ NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED: "false" }, async () => {
      const req = new Request("http://test/api/yjs/token", { method: "POST", body: JSON.stringify({ docId: "doc-1" }) });
      const res = (await tokenPOST(req)) as Response;
      expect(res.status).toBe(404);
    });
  });

  it("allows anonymous token on production for read-only viewing", async () => {
    getUserId.mockResolvedValueOnce(null);
    await withEnv({ NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED: "true", YJS_AUTH_SECRET: "test-secret" }, async () => {
      const req = new Request("https://negationgame.com/api/yjs/token", { method: "POST", body: JSON.stringify({ docId: "doc-1" }), headers: { "content-type": "application/json" } });
      const res = (await tokenPOST(req)) as Response;
      expect(res.status).toBe(200);
    });
  });

  it("500s when secret missing", async () => {
    getUserId.mockResolvedValueOnce("user-2");
    await withEnv({ NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED: "true" }, async () => {
      delete process.env.YJS_AUTH_SECRET;
      const req = new Request("https://negationgame.com/api/yjs/token", { method: "POST", body: JSON.stringify({ docId: "doc-1" }), headers: { "content-type": "application/json" } });
      const res = (await tokenPOST(req)) as Response;
      expect(res.status).toBe(500);
    });
  });

  it("returns 200 with JSON when configured", async () => {
    getUserId.mockResolvedValueOnce("user-3");
    await withEnv(
      { NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED: "true", YJS_AUTH_SECRET: "test-secret" },
      async () => {
        const req = new Request("https://negationgame.com/api/yjs/token", { method: "POST", body: JSON.stringify({ docId: "doc-1" }), headers: { "content-type": "application/json" } });
        const res = (await tokenPOST(req)) as Response;
        expect(res.status).toBe(200);
      }
    );
  });
});
