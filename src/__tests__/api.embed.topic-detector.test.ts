describe("embed topic-detector route", () => {
  const makeReq = (url: string) => new Request(url);

  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  const setNodeEnv = (value: string | undefined) => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value,
      configurable: true,
    });
  };

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    setNodeEnv(ORIGINAL_NODE_ENV);
  });

  it("encodes topicId on successful detection", async () => {
    setNodeEnv("production");

    const selectCallOrder: number[] = [];
    const dbMock = {
      select: jest.fn(() => ({
        from: () => ({
          where: () => ({
            limit: jest.fn(async () => {
              const callIndex = selectCallOrder.push(1);
              if (callIndex === 1) {
                return [
                  {
                    id: 123,
                    name: "Test Topic",
                    space: "scroll",
                  },
                ];
              }
              return [];
            }),
          }),
        }),
      })),
    } as any;

    const mockEncodeId = jest.fn((id: number) => `encoded-${id}`);
    jest.doMock("@/services/db", () => ({ db: dbMock }));
    jest.doMock("@/lib/negation-game/encodeId", () => ({
      encodeId: mockEncodeId,
    }));

    const { GET } = require("@/app/api/embed/topic-detector/route");

    const res = await GET(
      makeReq(
        "https://unit.test/api/embed/topic-detector?source=https://forum.scroll.io/t/example/123" as any
      ) as any
    );

    expect(res.status).toBe(200);
    expect(mockEncodeId).toHaveBeenCalledWith(123);
  });

  it("rejects localhost in production", async () => {
    setNodeEnv("production");

    // db won't be reached; still mock to avoid accidental real import
    jest.doMock("@/services/db", () => ({ db: { select: jest.fn() } }));
    // Ensure error helper returns a plain Response with 400
    jest.doMock("@/lib/security/headers", () => ({
      createSecureErrorResponse: (
        message: string,
        status = 400,
        corsOrigin = "https://forum.scroll.io"
      ) =>
        new Response(JSON.stringify({ error: message }), {
          status,
          headers: {
            "Access-Control-Allow-Origin": corsOrigin,
            "Content-Type": "application/json",
          },
        }),
    }));

    const { GET } = require("@/app/api/embed/topic-detector/route");

    const res = await GET(
      makeReq(
        "https://unit.test/api/embed/topic-detector?source=http://localhost:3000/t/foo/1" as any
      ) as any
    );
    // Expect a client/server error due to invalid URL in prod
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("enforces 2048 character source URL cap", async () => {
    setNodeEnv("production");

    jest.doMock("@/services/db", () => ({ db: { select: jest.fn() } }));
    jest.doMock("@/lib/security/headers", () => ({
      createSecureErrorResponse: (
        message: string,
        status = 400,
        corsOrigin = "https://forum.scroll.io"
      ) =>
        new Response(JSON.stringify({ error: message }), {
          status,
          headers: {
            "Access-Control-Allow-Origin": corsOrigin,
            "Content-Type": "application/json",
          },
        }),
    }));

    const { GET } = require("@/app/api/embed/topic-detector/route");

    const longPath = "a".repeat(2050);
    const url = `https://unit.test/api/embed/topic-detector?source=https://forum.scroll.io/t/${longPath}`;
    const res = await GET(makeReq(url as any) as any);

    expect(res.status).toBe(400);
  });
});
