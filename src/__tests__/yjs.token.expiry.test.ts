import { POST as tokenPOST } from "@/app/api/yjs/token/route";

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-1"),
}));

describe("yjs token expiry", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
    process.env.YJS_AUTH_SECRET = "secret";
  });

  it("issues an 8-hour expiry token", async () => {
    const before = Math.floor(Date.now() / 1000);
    const res = (await tokenPOST()) as any;
    expect((res as any).status).toBe(200);
    const expiresHeader = Number((res as any).headers?.get?.("x-yjs-expires-at") || 0);
    expect(Number.isFinite(expiresHeader)).toBe(true);
    const after = Math.floor(Date.now() / 1000);
    const expiresSec = Math.floor(expiresHeader / 1000);
    const expected = before + 60 * 60 * 8;
    const expectedMax = after + 60 * 60 * 8;
    // allow a few seconds jitter
    expect(expiresSec).toBeGreaterThanOrEqual(expected - 5);
    expect(expiresSec).toBeLessThanOrEqual(expectedMax + 5);
  });
});
