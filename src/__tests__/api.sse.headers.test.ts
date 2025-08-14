import { GET as sseGET } from "@/app/api/spaces/[spaceId]/messages/events/route";

jest.mock("@/actions/users/getUserId", () => ({
  getUserId: jest.fn(async () => "user-1"),
}));

jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn(async () => ({
    allowed: true,
    remaining: 59,
    resetTime: Date.now() + 60000,
  })),
}));

describe("messages SSE headers", () => {
  const makeReq = (origin?: string) =>
    new Request(
      "https://play.negationgame.com/api/spaces/global/messages/events?otherUserId=someone",
      {
        headers: origin ? { origin } : {},
      }
    ) as any;

  it("sets Access-Control-Allow-Origin to request origin and Vary: Origin", async () => {
    const res: Response = (await sseGET(
      makeReq("https://play.negationgame.com"),
      { params: Promise.resolve({ spaceId: "global" }) } as any
    )) as any;
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://play.negationgame.com"
    );
    expect(res.headers.get("Vary")).toBe("Origin");
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });
});
