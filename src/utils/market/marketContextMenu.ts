import { getDocIdFromURL, dispatchMarketRefresh } from "./marketUtils";
import { logger } from "@/lib/logger";

/**
 * Buy a fixed number of shares
 */
export async function buyShares(
  securityId: string,
  shares: number = 1
): Promise<void> {
  try {
    const docId = getDocIdFromURL();
    const deltaScaled = String(BigInt(shares) * 10n ** 18n);
    const res = await fetch(
      `/api/market/${encodeURIComponent(docId)}/buy-shares`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ securityId: String(securityId), deltaScaled }),
      }
    );
    if (res?.ok) {
      try {
        window.dispatchEvent(
          new CustomEvent("market:optimisticTrade", {
            detail: { docId, securityId: String(securityId), deltaScaled },
          })
        );
      } catch {}
    }

    dispatchMarketRefresh();
  } catch (error) {
    logger.error("Failed to buy shares:", error);
  }
}

/**
 * Buy shares by spending a specific amount
 */
export async function buyAmount(
  securityId: string,
  spendAmount: number
): Promise<void> {
  try {
    const docId = getDocIdFromURL();
    const scaled = BigInt(Math.round(spendAmount * 1e18)).toString();

    const res = await fetch(
      `/api/market/${encodeURIComponent(docId)}/buy-amount`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          securityId: String(securityId),
          spendScaled: scaled,
        }),
      }
    );
    try {
      if (res?.ok) {
        const json = await res.json().catch(() => null);
        const deltaScaled = String(json?.shares ?? "0");
        if (deltaScaled && deltaScaled !== "0") {
          window.dispatchEvent(
            new CustomEvent("market:optimisticTrade", {
              detail: { docId, securityId: String(securityId), deltaScaled },
            })
          );
        }
      }
    } catch {}

    dispatchMarketRefresh();
  } catch (error) {
    logger.error("Failed to buy amount:", error);
  }
}

/**
 * Sell a fixed number of shares (opens short if holding is zero)
 */
export async function sellShares(
  securityId: string,
  shares: number = 1
): Promise<void> {
  try {
    const docId = getDocIdFromURL();
    const deltaScaled = String(-1n * BigInt(shares) * 10n ** 18n);
    const res = await fetch(
      `/api/market/${encodeURIComponent(docId)}/buy-shares`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ securityId: String(securityId), deltaScaled }),
      }
    );
    if (res?.ok) {
      try {
        window.dispatchEvent(
          new CustomEvent("market:optimisticTrade", {
            detail: { docId, securityId: String(securityId), deltaScaled },
          })
        );
      } catch {}
    }

    dispatchMarketRefresh();
  } catch (error) {
    logger.error("Failed to sell shares:", error);
  }
}

/**
 * Sell by receiving a specific amount of proceeds
 */
export async function sellAmount(
  securityId: string,
  receiveAmount: number
): Promise<void> {
  try {
    const docId = getDocIdFromURL();
    const scaled = BigInt(Math.round(Math.abs(receiveAmount) * 1e18));
    const spendScaled = String(-scaled);

    const res = await fetch(
      `/api/market/${encodeURIComponent(docId)}/buy-amount`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ securityId: String(securityId), spendScaled }),
      }
    );
    try {
      if (res?.ok) {
        const json = await res.json().catch(() => null);
        const deltaScaled = String(json?.shares ?? "0");
        if (deltaScaled && deltaScaled !== "0") {
          window.dispatchEvent(
            new CustomEvent("market:optimisticTrade", {
              detail: { docId, securityId: String(securityId), deltaScaled },
            })
          );
        }
      }
    } catch {}

    dispatchMarketRefresh();
  } catch (error) {
    logger.error("Failed to sell amount:", error);
  }
}

/**
 * Close position for a security by trading back to zero holdings
 */
export async function closePosition(securityId: string): Promise<void> {
  try {
    const docId = getDocIdFromURL();
    const res = await fetch(`/api/market/${encodeURIComponent(docId)}/view`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const view = await res.json().catch(() => null);
    const scaled: string = view?.userHoldings?.[String(securityId)] || "0";
    const qty = BigInt(scaled || "0");
    if (qty === 0n) return;
    const deltaScaled = String(-qty);
    const post = await fetch(
      `/api/market/${encodeURIComponent(docId)}/buy-shares`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ securityId: String(securityId), deltaScaled }),
      }
    );
    if (post?.ok) {
      try {
        window.dispatchEvent(
          new CustomEvent("market:optimisticTrade", {
            detail: { docId, securityId: String(securityId), deltaScaled },
          })
        );
      } catch {}
    }
    dispatchMarketRefresh();
  } catch (error) {
    logger.error("Failed to close position:", error);
  }
}

/**
 * Create market-related context menu items
 */
export function createMarketContextMenuItems(securityId: string) {
  if (process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED !== "true") {
    return [];
  }

  const kind =
    (securityId || "").startsWith("edge:") ||
    (securityId || "").startsWith("edge-")
      ? "edge"
      : "node";

  return [
    {
      label: `Buy ${kind} +1 share` as const,
      onClick: async () => {
        await buyShares(securityId, 1);
      },
    },
    {
      label: `Buy ${kind} amount…` as const,
      onClick: async () => {
        const amt = prompt("Spend amount (units)");
        if (!amt) return;
        const n = Number(amt);
        if (!Number.isFinite(n) || n === 0) return;
        await buyAmount(securityId, n);
      },
    },
    {
      label: `Sell ${kind} −1 share` as const,
      onClick: async () => {
        await sellShares(securityId, 1);
      },
    },
    {
      label: `Sell ${kind} amount…` as const,
      onClick: async () => {
        const amt = prompt("Receive amount (units)");
        if (!amt) return;
        const n = Number(amt);
        if (!Number.isFinite(n) || n === 0) return;
        await sellAmount(securityId, n);
      },
    },
    {
      label: `Close ${kind} position` as const,
      onClick: async () => {
        await closePosition(securityId);
      },
    },
  ];
}
