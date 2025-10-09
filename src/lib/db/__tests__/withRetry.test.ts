import { withRetry, isStatementTimeoutError } from "@/lib/db/withRetry";

describe("withRetry", () => {
  it("retries on 57014 and succeeds", async () => {
    let calls = 0;
    const fn = jest.fn(async () => {
      calls += 1;
      if (calls < 2) {
        const e: any = new Error("canceling statement due to statement timeout");
        e.code = "57014";
        throw e;
      }
      return "ok";
    });
    const res = await withRetry(fn, {
      retries: 2,
      baseDelayMs: 1,
      shouldRetry: isStatementTimeoutError,
    });
    expect(res).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-timeout errors", async () => {
    const fn = jest.fn(async () => {
      const e: any = new Error("some other error");
      e.code = "12345";
      throw e;
    });
    await expect(
      withRetry(fn, { retries: 2, baseDelayMs: 1, shouldRetry: isStatementTimeoutError })
    ).rejects.toBeInstanceOf(Error);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

