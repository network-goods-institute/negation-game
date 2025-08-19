let GETHandler: any;

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-1"),
}));

jest.mock("@/lib/rateLimit", () => ({
  checkRateLimitStrict: jest.fn(async () => ({
    allowed: true,
    remaining: 9,
    resetTime: Date.now() + 60000,
  })),
}));

jest.mock("@/actions/search/getDiscourseContent", () => ({
  getDiscourseContent: jest.fn(
    async () => "Username: alice\nContent:\nHello world"
  ),
}));

describe("/api/discourse/content", () => {
  const makeReq = (url: string) => new Request(url);

  beforeEach(() => {
    jest.resetModules();
    ({ GET: GETHandler } = require("@/app/api/discourse/content/route"));
  });

  it("returns 401 when unauthenticated", async () => {
    jest.doMock("@/actions/users/getUserId", () => ({
      getUserId: jest.fn(async () => null),
    }));
    jest.resetModules();
    ({ GET: GETHandler } = require("@/app/api/discourse/content/route"));

    const res = await GETHandler(
      makeReq(
        "https://unit.test/api/discourse/content?url=https%3A%2F%2Fforum.scroll.io%2Ft%2Fslug"
      ) as any
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing url", async () => {
    const res = await GETHandler(
      makeReq("https://unit.test/api/discourse/content") as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid host", async () => {
    const res = await GETHandler(
      makeReq(
        "https://unit.test/api/discourse/content?url=https%3A%2F%2Fevil.example.com%2Ft%2Fbad"
      ) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    jest.doMock("@/lib/rateLimit", () => ({
      checkRateLimitStrict: jest.fn(async () => ({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      })),
    }));
    jest.resetModules();
    ({ GET: GETHandler } = require("@/app/api/discourse/content/route"));

    const res = await GETHandler(
      makeReq(
        "https://unit.test/api/discourse/content?url=https%3A%2F%2Fforum.scroll.io%2Ft%2Fslug"
      ) as any
    );
    expect(res.status).toBe(429);
  });

  it("returns 404 when content not found", async () => {
    jest.doMock("@/actions/search/getDiscourseContent", () => ({
      getDiscourseContent: jest.fn(async () => null),
    }));
    jest.resetModules();
    ({ GET: GETHandler } = require("@/app/api/discourse/content/route"));

    const res = await GETHandler(
      makeReq(
        "https://unit.test/api/discourse/content?url=https%3A%2F%2Fforum.scroll.io%2Ft%2Fslug"
      ) as any
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with content for valid request", async () => {
    const res = await GETHandler(
      makeReq(
        "https://unit.test/api/discourse/content?url=https%3A%2F%2Fforum.scroll.io%2Ft%2Fbetter-dao-decisions-aligned-incentives-research-on-carroll-mechanisms"
      ) as any
    );
    expect(res.status).toBe(200);
    const json = await (res as Response).json();
    expect(typeof json.content).toBe("string");
    expect(json.content.length).toBeGreaterThan(0);
  });
});
