/**
 * Utility for syncing market data to YDoc
 */

import { logger } from "@/lib/logger";

export interface MarketData {
  prices: Record<string, number>;
  holdings: Record<string, string>;
  totals: Record<string, string>;
  updatedAt: string;
}

/**
 * Sync market data to YDoc by merging with existing data
 */
export function syncMarketDataToYDoc(
  ydoc: any,
  yMetaMap: any,
  marketData: Partial<MarketData>,
  docId: string,
  origin: any,
  source?: string
): void {
  try {
    const existingPrices = (yMetaMap as any).get?.("market:prices") || {};
    const existingHoldings = (yMetaMap as any).get?.("market:holdings") || {};
    const existingTotals = (yMetaMap as any).get?.("market:totals") || {};

    const mergedPrices = { ...existingPrices, ...(marketData.prices || {}) };
    const mergedHoldings = {
      ...existingHoldings,
      ...(marketData.holdings || {}),
    };
    const mergedTotals = { ...existingTotals, ...(marketData.totals || {}) };

    (ydoc as any).transact?.(() => {
      (yMetaMap as any).set?.("market:prices", mergedPrices);
      (yMetaMap as any).set?.("market:holdings", mergedHoldings);
      (yMetaMap as any).set?.("market:totals", mergedTotals);
      (yMetaMap as any).set?.("market:docId", docId || null);
      (yMetaMap as any).set?.(
        "market:updatedAt",
        marketData.updatedAt || new Date().toISOString()
      );
      if (source) {
        (yMetaMap as any).set?.("market:source", source);
      }
    }, origin);
  } catch (error) {
    logger.error("Failed to sync market data to YDoc:", error);
  }
}
