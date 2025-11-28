"use server";
import { db } from "@/services/db";
import { safeUnstableCache } from "@/lib/cache/nextCache";
import { marketHoldingsTable } from "@/db/tables/marketHoldingsTable";
import { reconcileTradableSecurities } from "@/actions/market/reconcileTradableSecurities";
import { createMarketMaker, defaultB } from "@/lib/carroll/market";
import { and, eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { buildSecurities } from "@/lib/carroll/structure";
import { resolveSlugToId } from "@/utils/slugResolver";
import { createStructureWithSupports } from "./structureUtils";

export type MarketView = {
  prices: Record<string, number>;
  totals: Record<string, string>;
  userHoldings: Record<string, string>;
  updatedAt: string;
};

export async function computeMarketView(
  canonicalId: string,
  userId?: string
): Promise<MarketView> {
  const { structure, securities } =
    await reconcileTradableSecurities(canonicalId);
  try {
    logger.log(
      JSON.stringify({
        event: "market_view_build",
        docId: canonicalId,
        namesCount: structure.names.length,
        edgesCount: structure.edges.length,
        securitiesCount: securities.length,
        sampleSecurities: securities.slice(0, 10),
      })
    );
  } catch {}

  const rows = await db
    .select({
      userId: marketHoldingsTable.userId,
      securityId: marketHoldingsTable.securityId,
      amountScaled: marketHoldingsTable.amountScaled,
    })
    .from(marketHoldingsTable)
    .where(eq(marketHoldingsTable.docId, canonicalId));

  const normalize = (id: string) =>
    id?.startsWith("anchor:") ? id.slice("anchor:".length) : id;

  const rawTotals = new Map<string, bigint>();
  const userHoldingsRaw = new Map<string, string>();

  for (const r of rows) {
    const id = normalize(r.securityId);
    if (!id) continue;
    const v = BigInt(r.amountScaled || "0");
    rawTotals.set(id, (rawTotals.get(id) || 0n) + v);

    if (userId && r.userId === userId) {
      userHoldingsRaw.set(id, r.amountScaled || "0");
    }
  }

  let mmStruct = structure;
  let mmSecs = securities;
  if ((mmStruct.names.length === 0 || mmSecs.length === 0) && rows.length > 0) {
    const nodes = new Set<string>();
    const triples: Array<[string, string, string]> = [];
    for (const r of rows) {
      const rawId = normalize(r.securityId);
      if (!rawId) continue;
      const id = /^not(p-|s-|c-|group-|edge:)/.test(rawId)
        ? rawId.replace(/^not/, "")
        : rawId;
      if (/^(p-|s-|c-|group-)/.test(id)) {
        nodes.add(id);
      } else if (id.startsWith("edge:") && id.includes("->")) {
        try {
          const raw = id.slice("edge:".length);
          const [left, right] = raw.split("->");
          const leftParts = left.split(":");
          const srcId = leftParts.length >= 2 ? leftParts[1] : "";
          const tgtId = right.split(":")[0] || "";
          if (srcId && tgtId) {
            nodes.add(srcId);
            nodes.add(tgtId);
            triples.push([id, srcId, tgtId]);
          }
        } catch {}
      }
    }
    try {
      const s = createStructureWithSupports(Array.from(nodes), triples, []);
      const secs = buildSecurities(s, { includeNegations: "all" });
      mmStruct = s;
      mmSecs = secs;
      try {
        logger.log(
          JSON.stringify({
            event: "market_view_fallback",
            docId: canonicalId,
            nodes: s.nodes.length,
            edges: s.edges.length,
            supportEdges: (s as any).supportEdges?.length ?? 0,
            secs: mmSecs.length,
          })
        );
      } catch {}
    } catch {}
  }

  const totals = new Map<string, bigint>();
  for (const sec of mmSecs) totals.set(sec, rawTotals.get(sec) || 0n);

  const mm = createMarketMaker(mmStruct, defaultB, mmSecs, {
    enumerationCap: 1 << 19,
  });
  for (const sec of mmSecs) mm.setShares(sec, totals.get(sec) || 0n);
  const prices = mm.getPrices();
  try {
    const priceCount = Object.keys(prices || {}).length;
    const sample = Object.entries(prices || {}).slice(0, 3);
    logger.info?.("[market] view priced", {
      docId: canonicalId,
      names: mmStruct.names.length,
      edges: mmStruct.edges.length,
      secs: mmSecs.length,
      priceCount,
      sample,
    });
  } catch {}

  const secSet = new Set(mmSecs);
  const userHoldings: Record<string, string> = {};
  for (const [id, amount] of userHoldingsRaw) {
    if (secSet.has(id)) {
      userHoldings[id] = amount;
    }
  }

  const outTotals: Record<string, string> = {};
  for (const sec of mmSecs) outTotals[sec] = (totals.get(sec) || 0n).toString();

  const view: MarketView = {
    prices,
    totals: outTotals,
    userHoldings,
    updatedAt: new Date().toISOString(),
  };

  return view;
}

export async function getMarketView(
  docId: string,
  userId?: string
): Promise<MarketView> {
  const canonicalId = await resolveSlugToId(docId);

  const getCachedMarketView = safeUnstableCache(
    async (canonicalId: string, userId?: string) => {
      return computeMarketView(canonicalId, userId);
    },
    ["market-view", canonicalId, userId || "anon"],
    {
      tags: [`market-view:${canonicalId}`],
      revalidate: 30,
    }
  );

  return getCachedMarketView(canonicalId, userId);
}
