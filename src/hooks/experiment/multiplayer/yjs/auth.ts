export type YjsAuth = {
  token: string;
  expiresAt: number; // ms epoch
};

export const fetchYjsAuthToken = async (): Promise<YjsAuth> => {
  const res = await fetch("/api/yjs/token", { method: "POST" });
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const body = (await res.json()) as YjsAuth;
  if (!body?.token || !body?.expiresAt) throw new Error("Invalid token payload");
  return body;
};

export const getRefreshDelayMs = (expiresAt: number): number => {
  const now = Date.now();
  const safetyMs = 5 * 60 * 1000; // refresh 5 minutes early
  const delta = Math.max(10_000, expiresAt - safetyMs - now); // at least 10s
  return delta;
};

