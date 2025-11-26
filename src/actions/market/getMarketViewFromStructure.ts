"use server";
import { buildSecurities } from "@/lib/carroll/structure";
import { createMarketMaker, defaultB } from "@/lib/carroll/market";
import { db } from "@/services/db";
import { marketHoldingsTable } from "@/db/tables/marketHoldingsTable";
import { and, eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { resolveSlugToId } from "@/utils/slugResolver";
import { createStructureWithSupports } from "./structureUtils";

export type MarketView = {
  prices: Record<string, number>;
  totals: Record<string, string>;
  userHoldings: Record<string, string>;
  updatedAt: string;
};

export type StructureOverride = {
  nodes: string[];
  edges: Array<{ id: string; source: string; target: string; type?: string }>;
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
  const normalizedEdges: Array<{ id: string; src: string; tgt: string; type?: string }> = [];
  const seenEdgeNames = new Set<string>();
  for (const e of override?.edges || []) {
    if (!e || !e.id) continue;
    if (seenEdgeNames.has(e.id)) continue;
    const src = (e.source || "").startsWith("anchor:") ? e.source.slice("anchor:".length) : e.source;
    const tgt = (e.target || "").startsWith("anchor:") ? e.target.slice("anchor:".length) : e.target;
    if (!src || !tgt) continue;
    if (e.id === src || e.id === tgt) continue;
    normalizedEdges.push({ id: e.id, src, tgt, type: e.type });
    seenEdgeNames.add(e.id);
  }
  const nodeSet = new Set(nodeIds);
  const edgeNameSet = new Set(normalizedEdges.map((e) => e.id));
  const negationTriples: Array<[string, string, string]> = [];
  const supportTriples: Array<[string, string, string]> = [];
  for (const e of normalizedEdges) {
    const fromOk = nodeSet.has(e.src) || edgeNameSet.has(e.src);
    const toOk = nodeSet.has(e.tgt) || edgeNameSet.has(e.tgt);
    if (!fromOk || !toOk) continue;
    if (e.type === "support") {
      supportTriples.push([e.id, e.src, e.tgt]);
    } else {
      negationTriples.push([e.id, e.src, e.tgt]);
    }
  }
  const structure = createStructureWithSupports(nodeIds, negationTriples, supportTriples);
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

  const mm = createMarketMaker(structure, defaultB, securities, { enumerationCap: 1 << 19 });
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
