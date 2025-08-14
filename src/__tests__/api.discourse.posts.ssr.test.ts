import { GET as postsGET } from "@/app/api/discourse/posts/route";

const makeReq = (url: string, cookie?: string) =>
  new Request(url, {
    headers: cookie
      ? { cookie, origin: "https://play.negationgame.com" }
      : { origin: "https://play.negationgame.com" },
  });

// Mock getUserId to simulate authenticated/unauthenticated states
jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-1"),
}));

// Mock strict rate limiter to always allow during unit tests
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimitStrict: jest.fn(async () => ({
    allowed: true,
    remaining: 9,
    resetTime: Date.now() + 60000,
  })),
}));

describe("/api/discourse/posts SSRF protections", () => {
  it("rejects unauthenticated requests", async () => {
    const { getUserId } = require("@/actions/users/getUserId");
    getUserId.mockResolvedValueOnce(null);
    const res = await postsGET(
      makeReq(
        "https://example.com/api/discourse/posts?username=alice&url=https://forum.ethereum.org" as any
      ) as any
    );
    expect(res.status).toBe(401);
  });

  it("rejects non-HTTPS forums", async () => {
    const res = await postsGET(
      makeReq(
        "https://unit.test/api/discourse/posts?username=alice&url=http://forum.ethereum.org" as any
      ) as any
    );
    expect(res.status).toBe(400);
  });

  it("rejects private IP / localhost forums", async () => {
    const badHosts = [
      "https://127.0.0.1",
      "https://localhost",
      "https://10.0.0.1",
      "https://192.168.1.5",
      "https://172.16.0.1",
    ];
    for (const host of badHosts) {
      const res = await postsGET(
        makeReq(
          `https://unit.test/api/discourse/posts?username=alice&url=${encodeURIComponent(host)}` as any
        ) as any
      );
      expect(res.status).toBe(400);
    }
  });

  it("rejects disallowed forum host", async () => {
    const res = await postsGET(
      makeReq(
        "https://unit.test/api/discourse/posts?username=alice&url=https://example.com" as any
      ) as any
    );
    expect(res.status).toBe(400);
  });

  it("rejects invalid username patterns", async () => {
    const res = await postsGET(
      makeReq(
        "https://unit.test/api/discourse/posts?username=../etc/passwd&url=https://forum.ethereum.org" as any
      ) as any
    );
    expect(res.status).toBe(400);
  });
});
