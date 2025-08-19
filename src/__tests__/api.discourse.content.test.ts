const setup = async (opts?: {
  authed?: boolean;
  rateAllowed?: boolean;
  content?: string | null;
}) => {
  const authed = opts?.authed !== false;
  const rateAllowed = opts?.rateAllowed !== false;
  const content =
    opts?.content === undefined
      ? "Username: alice\nContent:\nHello world"
      : opts.content;

  jest.resetModules();
  jest.doMock("@/actions/users/getUserId", () => ({
    getUserId: jest.fn(async () => (authed ? "user-1" : null)),
  }));
  jest.doMock("@/lib/rateLimit", () => ({
    checkRateLimitStrict: jest.fn(async () => ({
      allowed: rateAllowed,
      remaining: rateAllowed ? 9 : 0,
      resetTime: Date.now() + 60000,
    })),
  }));
  jest.doMock("@/actions/search/getDiscourseContent", () => ({
    getDiscourseContent: jest.fn(async () => content),
  }));
  const route = require("@/app/api/discourse/content/route");
  return route.GET as (req: Request) => Promise<Response>;
};

describe("/api/discourse/content", () => {
  const makeReq = (url: string) => new Request(url);

  it("returns 401 when unauthenticated", async () => {
    const GETHandler = await setup({ authed: false });

    const res = await GETHandler(
      makeReq(
        "https://unit.test/api/discourse/content?url=https%3A%2F%2Fforum.scroll.io%2Ft%2Fslug"
      ) as any
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing url", async () => {
    const GETHandler = await setup();
    const res = await GETHandler(
      makeReq("https://unit.test/api/discourse/content") as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid host", async () => {
    const GETHandler = await setup();
    const res = await GETHandler(
      makeReq(
        "https://unit.test/api/discourse/content?url=https%3A%2F%2Fevil.example.com%2Ft%2Fbad"
      ) as any
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    const GETHandler = await setup({ rateAllowed: false });

    const res = await GETHandler(
      makeReq(
        "https://unit.test/api/discourse/content?url=https%3A%2F%2Fforum.scroll.io%2Ft%2Fslug"
      ) as any
    );
    expect(res.status).toBe(429);
  });

  it("returns 404 when content not found", async () => {
    const GETHandler = await setup({ content: null });

    const res = await GETHandler(
      makeReq(
        "https://unit.test/api/discourse/content?url=https%3A%2F%2Fforum.scroll.io%2Ft%2Fslug"
      ) as any
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 with content for valid request", async () => {
    const GETHandler = await setup();
    const res = await GETHandler(
      makeReq(
        "https://unit.test/api/discourse/content?url=https%3A%2F%2Fforum.scroll.io%2Ft%2Fbetter-dao-decisions-aligned-incentives-research-on-carroll-mechanisms"
      ) as any
    );
    expect(res.status).toBe(200);
    const {
      getDiscourseContent,
    } = require("@/actions/search/getDiscourseContent");
    expect(getDiscourseContent).toHaveBeenCalled();
  });
});
