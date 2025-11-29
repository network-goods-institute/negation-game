/**
 * Market utility functions for handling market data operations
 */

export const SHARES_SCALE_FACTOR = 1e18;

/**
 * Convert scaled shares string to number
 */
export function scaleToShares(scaled: string): number {
  return Number(scaled || "0") / SHARES_SCALE_FACTOR;
}

/**
 * Convert shares number to scaled string
 */
export function sharesToScaled(shares: number): string {
  return BigInt(Math.round(shares * SHARES_SCALE_FACTOR)).toString();
}

/**
 * Calculate market influence from holdings
 * @param mine - User's shares
 * @param total - Total shares in the market
 * @returns Influence value between -1 and 1
 */
export function calculateMarketInfluence(mine: number, total: number): number {
  if (total <= 0) return 0;
  return (2 * mine - total) / total;
}

/**
 * Normalize security ID by removing anchor: prefix
 */
export function normalizeSecurityId(id: string): string {
  return id?.startsWith('anchor:') ? id.slice('anchor:'.length) : id;
}

/**
 * Check if market feature is enabled (client-side)
 */
export function isMarketEnabled(): boolean {
  return typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED === 'true';
}

/**
 * Market status types
 */
export type MarketStatus = 'not-tradeable' | 'pending' | 'active';

/**
 * Determine if a node/edge type is tradeable
 */
export function isTradeableType(type: string | undefined, itemType: 'node' | 'edge'): boolean {
  if (!type) return false;
  const t = type.toLowerCase();

  if (itemType === 'node') {
    // Tradeable node types: point, objection
    // Not tradeable: statement, comment, edge_anchor
    return t === 'point' || t === 'objection';
  } else {
    // Tradeable edge types: support, negation, objection
    return t === 'support' || t === 'negation' || t === 'objection';
  }
}

/**
 * Get market status for a node/edge
 * - 'not-tradeable': Node/edge type isn't tradeable
 * - 'pending': Should be tradeable but doesn't have price data yet
 * - 'active': Has price data, fully in market
 */
export function getMarketStatus(item: { type?: string; data?: any }, itemType: 'node' | 'edge'): MarketStatus {
  const tradeable = isTradeableType(item.type, itemType);

  if (!tradeable) {
    return 'not-tradeable';
  }

  // Check if has price data
  const hasPrice = typeof item.data?.market?.price === 'number' && Number.isFinite(item.data.market.price);

  return hasPrice ? 'active' : 'pending';
}

/**
 * Extract market data from node/edge data object
 */
export function extractMarketData(data: any): {
  price: number;
  mine: number;
  total: number;
  influence: number;
  hasPrice: boolean;
  hasHoldings: boolean;
} {
  try {
    const price = Number(data?.market?.price ?? NaN);
    const mine = Number(data?.market?.mine ?? NaN);
    const total = Number(data?.market?.total ?? NaN);
    const influence = Number(data?.market?.influence ?? NaN);

    return {
      price: Number.isFinite(price) ? price : NaN,
      mine: Number.isFinite(mine) ? mine : NaN,
      total: Number.isFinite(total) ? total : NaN,
      influence: Number.isFinite(influence) ? influence : NaN,
      hasPrice: Number.isFinite(price),
      hasHoldings: Number.isFinite(mine) && mine > 0,
    };
  } catch {
    return {
      price: NaN,
      mine: NaN,
      total: NaN,
      influence: NaN,
      hasPrice: false,
      hasHoldings: false,
    };
  }
}

/**
 * Enrich item with market data (prices, holdings, totals) and market status
 */
export function enrichWithMarketData<T extends { id: string; type?: string; data?: any }>(
  item: T,
  marketPrices: Record<string, number> | null,
  marketHoldings: Record<string, string> | null,
  marketTotals: Record<string, string> | null,
  itemType?: 'node' | 'edge'
): T {
  let data = { ...item.data };
  const key = normalizeSecurityId(item.id);

  // Enrich with price
  if (marketPrices && typeof marketPrices[key] === 'number') {
    const p = Number(marketPrices[key]);
    if (Number.isFinite(p)) {
      data = { ...data, market: { ...data?.market, price: p } };
    }
  }

  // Enrich totals (even without holdings)
  if (marketTotals) {
    const totStr = marketTotals[key];
    const tot = totStr ? scaleToShares(totStr) : 0;
    data = { ...data, market: { ...data?.market, total: tot } };
  }

  // Enrich holdings (if available) and influence
  if (marketHoldings) {
    const usrStr = marketHoldings[key] || '0';
    const usr = scaleToShares(usrStr);
    const tot = Number(data?.market?.total ?? 0);
    const influence = calculateMarketInfluence(usr, tot);
    data = { ...data, market: { ...data?.market, mine: usr, mineNorm: tot > 0 ? usr / tot : 0, influence } };
  }

  // Add market status
  if (itemType) {
    const enrichedItem = { ...item, data };
    const status = getMarketStatus(enrichedItem, itemType);
    data = { ...data, market: { ...data?.market, status } };
  }

  return { ...item, data };
}

/**
 * Get document ID from current URL
 */
export function getDocIdFromURL(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname.split('/').pop() || '';
}

/**
 * Dispatch market refresh event
 */
export function dispatchMarketRefresh(): void {
  try {
    window.dispatchEvent(new Event('market:refresh'));
  } catch {}
}

/**
 * Build market view payload from nodes and edges
 */
export function buildMarketViewPayload(nodes: any[], edges: any[]): {
  nodes: string[];
  edges: Array<{ id: string; source: string; target: string }>;
} {
  return {
    nodes: (nodes || [])
      .filter((n) => String(n?.type || '') !== 'edge_anchor')
      .map((n) => String(n.id)),
    edges: (edges || [])
      .filter((e) => {
        const edgeType = String(e?.type || '').toLowerCase();
        return edgeType === 'support' || edgeType === 'negation' || edgeType === 'objection';
      })
      .map((e) => ({
        id: String(e.id),
        source: String(e?.source || '').replace(/^anchor:/, ''),
        target: String(e?.target || '').replace(/^anchor:/, ''),
      })),
  };
}
