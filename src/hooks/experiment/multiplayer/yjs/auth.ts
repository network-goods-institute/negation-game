export type YjsAuth = {
  token: string;
  expiresAt: number; // ms epoch
};

export const fetchYjsAuthToken = async (params: {
  docId: string;
  shareToken?: string | null;
}): Promise<YjsAuth> => {
  const res = await fetch("/api/yjs/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      docId: params.docId,
      shareToken: params.shareToken || null,
    }),
  });
  if (!res.ok) {
    if (res.status === 401) {
      const err: any = new Error("AUTH_EXPIRED");
      err.code = "AUTH_EXPIRED";
      throw err;
    }
    throw new Error(`Token fetch failed: ${res.status}`);
  }
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

