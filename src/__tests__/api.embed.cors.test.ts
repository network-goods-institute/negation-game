describe("embed API CORS", () => {
  const origin = "https://louie.networkgoods.institute";

  beforeEach(() => {
    jest.resetModules();
    jest.doMock("@/services/db", () => ({ db: {} }));
    jest.doMock("@/lib/rateLimit", () => ({
      checkRateLimit: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.dontMock("@/services/db");
    jest.dontMock("@/lib/rateLimit");
  });

  it.each([
    "@/app/api/embed/auth/route",
    "@/app/api/embed/topic-detector/route",
    "@/app/api/embed/create-topic/route",
  ])("allows the Network Goods origin for %s", async (routePath) => {
    const { OPTIONS } = require(routePath);
    const request = new Request("https://unit.test", {
      headers: { origin },
    });

    const response = await OPTIONS(request as any);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });
});
