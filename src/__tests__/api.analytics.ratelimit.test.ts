// Defer route imports until after jest.mock calls so module mocks take effect
let contestedGET: any;
let usersAlignmentGET: any;

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-1"),
}));

jest.mock("@/lib/rateLimit", () => ({
  checkRateLimitStrict: jest.fn(),
}));

describe("analytics endpoints strict rate limit", () => {
  const makeReq = (url: string) => new Request(url);

  it("returns 429 when strict limiter blocks", async () => {
    ({ GET: contestedGET } = require("@/app/api/analytics/contested/route"));
    ({
      GET: usersAlignmentGET,
    } = require("@/app/api/analytics/users-alignment/route"));
    const { checkRateLimitStrict } = require("@/lib/rateLimit");
    checkRateLimitStrict.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
    });

    const res1 = await contestedGET(
      makeReq("https://unit.test/api/analytics/contested" as any) as any
    );
    expect(res1.status).toBe(429);

    const res2 = await usersAlignmentGET(
      makeReq("https://unit.test/api/analytics/users-alignment" as any) as any
    );
    expect(res2.status).toBe(429);
  });

  it("passes when strict limiter allows", async () => {
    jest.resetModules();
    jest.doMock("@/lib/rateLimit", () => ({
      checkRateLimitStrict: jest.fn(async () => ({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
      })),
    }));
    jest.doMock("@/actions/analytics/computeContestedPoints", () => ({
      computeContestedPoints: jest.fn(async () => ({ points: [] })),
    }));
    jest.doMock("@/actions/analytics/computeUsersDaoAlignment", () => ({
      computeUsersDaoAlignment: jest.fn(async () => ({ data: [] })),
    }));

    ({ GET: contestedGET } = require("@/app/api/analytics/contested/route"));
    ({
      GET: usersAlignmentGET,
    } = require("@/app/api/analytics/users-alignment/route"));

    const ok1 = await contestedGET(
      makeReq("https://unit.test/api/analytics/contested" as any) as any
    );
    expect(ok1.status).toBe(200);

    const ok2 = await usersAlignmentGET(
      makeReq("https://unit.test/api/analytics/users-alignment" as any) as any
    );
    expect(ok2.status).toBe(200);
  });
});
