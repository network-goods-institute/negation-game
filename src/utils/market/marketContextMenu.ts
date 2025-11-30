import { getDocIdFromURL, dispatchMarketRefresh } from "./marketUtils";
import { logger } from "@/lib/logger";

async function postJson(url: string, body: any): Promise<{ ok: boolean; json: any | null }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      try { await res.text(); } catch {}
      return { ok: false, json: null };
    }
    try { return { ok: true, json: await res.json() }; } catch { return { ok: true, json: null }; }
  } catch (e) {
    try { logger.warn?.("[market] postJson error", { url, error: String((e as any)?.message || e) }); } catch {}
    return { ok: false, json: null };
  }
}

export async function buyShares(securityId: string, shares: number = 1): Promise<boolean> {
  const docId = getDocIdFromURL();
  const deltaScaled = String(BigInt(shares) * 10n ** 18n);
  try { window.dispatchEvent(new CustomEvent("market:tradeStarted", { detail: { docId, securityId: String(securityId), kind: "buyShares", deltaScaled } })); } catch {}
  const { ok } = await postJson(`/api/market/${encodeURIComponent(docId)}/buy-shares`, {
    securityId: String(securityId),
    deltaScaled,
  });
  if (ok) {
    window.dispatchEvent(new CustomEvent("market:optimisticTrade", { detail: { docId, securityId: String(securityId), deltaScaled } }));
    window.dispatchEvent(new CustomEvent("market:tradeComplete", { detail: { docId, securityId: String(securityId), deltaScaled } }));
  }
  dispatchMarketRefresh();
  try { window.dispatchEvent(new CustomEvent("market:tradeFinished", { detail: { docId, securityId: String(securityId), kind: "buyShares" } })); } catch {}
  return ok;
}

export async function buyAmount(securityId: string, spendAmount: number): Promise<boolean> {
  const docId = getDocIdFromURL();
  const scaled = BigInt(Math.round(spendAmount * 1e18)).toString();
  try { window.dispatchEvent(new CustomEvent("market:tradeStarted", { detail: { docId, securityId: String(securityId), kind: "buyAmount", spendScaled: scaled } })); } catch {}
  const { ok, json } = await postJson(`/api/market/${encodeURIComponent(docId)}/buy-amount`, {
    securityId: String(securityId),
    spendScaled: scaled,
  });
  if (ok) {
    const deltaScaled = String(json?.shares ?? "0");
    if (deltaScaled && deltaScaled !== "0") {
      window.dispatchEvent(new CustomEvent("market:optimisticTrade", { detail: { docId, securityId: String(securityId), deltaScaled } }));
      window.dispatchEvent(new CustomEvent("market:tradeComplete", { detail: { docId, securityId: String(securityId), deltaScaled } }));
    }
  }
  dispatchMarketRefresh();
  try { window.dispatchEvent(new CustomEvent("market:tradeFinished", { detail: { docId, securityId: String(securityId), kind: "buyAmount" } })); } catch {}
  return ok;
}

export async function sellShares(securityId: string, shares: number = 1): Promise<boolean> {
  const docId = getDocIdFromURL();
  const deltaScaled = String(-1n * BigInt(shares) * 10n ** 18n);
  try { window.dispatchEvent(new CustomEvent("market:tradeStarted", { detail: { docId, securityId: String(securityId), kind: "sellShares", deltaScaled } })); } catch {}
  const { ok } = await postJson(`/api/market/${encodeURIComponent(docId)}/buy-shares`, {
    securityId: String(securityId),
    deltaScaled,
  });
  if (ok) {
    window.dispatchEvent(new CustomEvent("market:optimisticTrade", { detail: { docId, securityId: String(securityId), deltaScaled } }));
    window.dispatchEvent(new CustomEvent("market:tradeComplete", { detail: { docId, securityId: String(securityId), deltaScaled } }));
  }
  dispatchMarketRefresh();
  try { window.dispatchEvent(new CustomEvent("market:tradeFinished", { detail: { docId, securityId: String(securityId), kind: "sellShares" } })); } catch {}
  return ok;
}

export async function sellAmount(securityId: string, receiveAmount: number): Promise<boolean> {
  const docId = getDocIdFromURL();
  const scaled = BigInt(Math.round(Math.abs(receiveAmount) * 1e18));
  const spendScaled = String(-scaled);
  try { window.dispatchEvent(new CustomEvent("market:tradeStarted", { detail: { docId, securityId: String(securityId), kind: "sellAmount", spendScaled } })); } catch {}
  const { ok, json } = await postJson(`/api/market/${encodeURIComponent(docId)}/buy-amount`, {
    securityId: String(securityId),
    spendScaled,
  });
  if (ok) {
    const deltaScaled = String(json?.shares ?? "0");
    if (deltaScaled && deltaScaled !== "0") {
      window.dispatchEvent(new CustomEvent("market:optimisticTrade", { detail: { docId, securityId: String(securityId), deltaScaled } }));
      window.dispatchEvent(new CustomEvent("market:tradeComplete", { detail: { docId, securityId: String(securityId), deltaScaled } }));
    }
  }
  dispatchMarketRefresh();
  try { window.dispatchEvent(new CustomEvent("market:tradeFinished", { detail: { docId, securityId: String(securityId), kind: "sellAmount" } })); } catch {}
  return ok;
}

export async function closePosition(securityId: string): Promise<boolean> {
  const docId = getDocIdFromURL();
  const res = await fetch(`/api/market/${encodeURIComponent(docId)}/view`, { cache: "no-store" }).catch(() => null as any);
  if (!res || !res.ok) return false;
  const view = await res.json().catch(() => null);
  const scaled: string = view?.userHoldings?.[String(securityId)] || "0";
  const qty = BigInt(scaled || "0");
  if (qty === 0n) return false;
  const deltaScaled = String(-qty);
  try { window.dispatchEvent(new CustomEvent("market:tradeStarted", { detail: { docId, securityId: String(securityId), kind: "closePosition", deltaScaled } })); } catch {}
  const { ok } = await postJson(`/api/market/${encodeURIComponent(docId)}/buy-shares`, {
    securityId: String(securityId),
    deltaScaled,
  });
  if (ok) {
    window.dispatchEvent(new CustomEvent("market:optimisticTrade", { detail: { docId, securityId: String(securityId), deltaScaled } }));
    window.dispatchEvent(new CustomEvent("market:tradeComplete", { detail: { docId, securityId: String(securityId), deltaScaled } }));
  }
  dispatchMarketRefresh();
  try { window.dispatchEvent(new CustomEvent("market:tradeFinished", { detail: { docId, securityId: String(securityId), kind: "closePosition" } })); } catch {}
  return ok;
}

export function createMarketContextMenuItems(securityId: string) {
  if (process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED !== "true") {
    return [];
  }
  const kind = (securityId || "").startsWith("edge:") || (securityId || "").startsWith("edge-") ? "edge" : "node";
  return [
    { label: `Buy ${kind} +1 share` as const, onClick: async () => { await buyShares(securityId, 1); } },
    { label: `Buy ${kind} amount…` as const, onClick: async () => { const amt = prompt("Spend amount (units)"); if (!amt) return; const n = Number(amt); if (!Number.isFinite(n) || n === 0) return; await buyAmount(securityId, n); } },
    { label: `Sell ${kind} −1 share` as const, onClick: async () => { await sellShares(securityId, 1); } },
    { label: `Sell ${kind} amount…` as const, onClick: async () => { const amt = prompt("Receive amount (units)"); if (!amt) return; const n = Number(amt); if (!Number.isFinite(n) || n === 0) return; await sellAmount(securityId, n); } },
    { label: `Close ${kind} position` as const, onClick: async () => { await closePosition(securityId); } },
  ];
}

