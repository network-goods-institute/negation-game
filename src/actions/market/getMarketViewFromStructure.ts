"use server";
import { createStructure, buildSecurities } from "@/lib/carroll/structure";
import { createMarketMaker, defaultB } from "@/lib/carroll/market";
import { db } from "@/services/db";
import { marketHoldingsTable } from "@/db/tables/marketHoldingsTable";
import { and, eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { resolveSlugToId } from "@/utils/slugResolver";

export type MarketView = {
  prices: Record<string, number>;
  totals: Record<string, string>;
  userHoldings: Record<string, string>;
  updatedAt: string;
};

export type StructureOverride = {
  nodes: string[];
  edges: Array<{ id: string; source: string; target: string }>;
};

export async function getMarketViewFromStructure(docId: string, userId: string | undefined, override: StructureOverride): Promise<MarketView> {
  const canonicalId = await resolveSlugToId(docId);
  // Build Carroll structure from client-provided nodes/edges
  const nodeIds = Array.from(
    new Set(
      (override?.nodes || [])
        .filter((n) => typeof n === "string" && n.length > 0)
        .filter((s) => !s.startsWith("anchor:"))
    )
  );
  const triples: Array<[string, string, string]> = [];
  for (const e of override?.edges || []) {
    if (!e || !e.id) continue;
    const src = (e.source || "").startsWith("anchor:") ? e.source.slice("anchor:".length) : e.source;
    const tgt = (e.target || "").startsWith("anchor:") ? e.target.slice("anchor:".length) : e.target;
    if (!src || !tgt) continue;
    triples.push([e.id, src, tgt]);
  }
  const structure = createStructure(nodeIds, triples);
  const securities = buildSecurities(structure, { includeNegations: "all" });

  // Load totals from DB for canonical doc id
  const rows = await db
    .select({ securityId: marketHoldingsTable.securityId, amountScaled: marketHoldingsTable.amountScaled })
    .from(marketHoldingsTable)
    .where(eq(marketHoldingsTable.docId, canonicalId));
  const totals = new Map<string, bigint>();
  for (const sec of securities) totals.set(sec, 0n);
  const secSet = new Set(securities);
  const normalize = (id: string) => (id?.startsWith("anchor:") ? id.slice("anchor:".length) : id);
  for (const r of rows) {
    const id = normalize(r.securityId);
    if (!secSet.has(id)) continue;
    totals.set(id, (totals.get(id) || 0n) + BigInt(r.amountScaled || "0"));
  }

  const mm = createMarketMaker(structure, defaultB, securities, { enumerationCap: 1 << 18 });
  for (const sec of securities) mm.setShares(sec, totals.get(sec) || 0n);
  const prices = mm.getPrices();
  try {
    const priceCount = Object.keys(prices || {}).length;
    logger.info?.('[market] view priced (override)', { docId: canonicalId, names: structure.names.length, edges: structure.edges.length, secs: securities.length, priceCount });
  } catch {}
  // User holdings
  const userRows = userId
    ? await db
        .select({ securityId: marketHoldingsTable.securityId, amountScaled: marketHoldingsTable.amountScaled })
        .from(marketHoldingsTable)
        .where(and(eq(marketHoldingsTable.docId, canonicalId), eq(marketHoldingsTable.userId, userId)))
    : [];
  const userHoldings: Record<string, string> = {};
  for (const r of userRows) {
    const id = normalize(r.securityId);
    if (!secSet.has(id)) continue;
    userHoldings[id] = r.amountScaled || "0";
  }
  const outTotals: Record<string, string> = {};
  for (const sec of securities) outTotals[sec] = (totals.get(sec) || 0n).toString();
  return { prices, totals: outTotals, userHoldings, updatedAt: new Date().toISOString() };
}
