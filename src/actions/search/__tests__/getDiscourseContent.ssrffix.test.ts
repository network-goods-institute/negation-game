import { getDiscourseContent } from "../../search/getDiscourseContent";

jest.setTimeout(15000);

describe("getDiscourseContent SSRF redirect allow-list enforcement", () => {
  const originalFetch = global.fetch as any;
  const originalAbortTimeout = (global as any).AbortSignal?.timeout;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    if (originalAbortTimeout) {
      (AbortSignal as any).timeout = originalAbortTimeout;
    }
  });

  it("does not update cleanUrl to disallowed host after redirect", async () => {
    (AbortSignal as any).timeout = (_ms: number) => undefined;
    const calls: Array<any> = [];
    const headers = { get: (_: string) => null } as any;

    let callIndex = 0;
    global.fetch = jest.fn(async (input: any, _init?: any) => {
      calls.push(input);
      callIndex++;
      if (callIndex === 1) {
        // First fetch: slug-only page HTML, simulate redirect final URL to disallowed host
        return {
          ok: true,
          url: "https://evil.example.com/t/topic-slug/123",
          headers,
          text: async () => "",
        } as any;
      }
      // Second fetch: JSON API for the original allowed host
      return {
        ok: true,
        headers,
        json: async () => ({
          post_stream: {
            posts: [
              { post_number: 1, cooked: "<p>Hello</p>", username: "alice" },
            ],
          },
        }),
      } as any;
    }) as any;

    const inputUrl = "https://forum.ethereum.org/t/topic-slug";
    const result = await getDiscourseContent(inputUrl, { firstPostOnly: true });

    // Ensure second call stayed on the allowed host
    expect(calls[1] as string).toContain("forum.ethereum.org");
    expect(result).toContain("Hello");
  });
});
