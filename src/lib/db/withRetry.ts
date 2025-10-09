type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  shouldRetry?: (err: unknown) => boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function isStatementTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as any;
  const code: string | undefined = anyErr.code;
  const msg: string = String(anyErr.message || "");
  return code === "57014" || msg.toLowerCase().includes("statement timeout");
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = Math.max(0, opts.retries ?? 2);
  const base = Math.max(0, opts.baseDelayMs ?? 200);
  const shouldRetry = opts.shouldRetry ?? (() => false);

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;
      const delay = base * Math.pow(2, attempt);
      await sleep(delay);
      attempt += 1;
    }
  }
}

