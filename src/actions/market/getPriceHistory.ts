import { db } from "@/services/db";
import { marketTradesTable } from "@/db/tables/marketTradesTable";
import { eq, and, desc, lt } from "drizzle-orm";
import { resolveSlugToId } from "@/utils/slugResolver";
import { fromFixed } from "@/lib/carroll";
import { buildStructureFromDoc } from "@/actions/market/buildStructureFromDoc";
import { createMarketMaker, defaultB } from "@/lib/carroll/market";

export type PricePoint = {
  timestamp: string;
  price: number;
  deltaScaled: string;
  costScaled: string;
};

export async function getPriceHistory(
  docId: string,
  securityId: string,
  limit: number = 50,
  includeBaseline: boolean = false
): Promise<PricePoint[]> {
  const canonicalId = await resolveSlugToId(docId);

  const normalize = (id: string) =>
    id?.startsWith("anchor:") ? id.slice("anchor:".length) : id;
  const normalizedSecurityId = normalize(securityId);

  let trades: Array<{
    deltaScaled: string;
    costScaled: string;
    priceAfterScaled?: string | null;
    createdAt: Date;
  }> = [];
  try {
    trades = await db
      .select({
        deltaScaled: marketTradesTable.deltaScaled,
        costScaled: marketTradesTable.costScaled,
        priceAfterScaled: marketTradesTable.priceAfterScaled,
        createdAt: marketTradesTable.createdAt,
      })
      .from(marketTradesTable)
      .where(
        and(
          eq(marketTradesTable.docId, canonicalId),
          eq(marketTradesTable.securityId, normalizedSecurityId)
        )
      )
      .orderBy(desc(marketTradesTable.createdAt))
      .limit(Math.min(limit, 200));
  } catch {
    trades = await db
      .select({
        deltaScaled: marketTradesTable.deltaScaled,
        costScaled: marketTradesTable.costScaled,
        createdAt: marketTradesTable.createdAt,
      })
      .from(marketTradesTable)
      .where(
        and(
          eq(marketTradesTable.docId, canonicalId),
          eq(marketTradesTable.securityId, normalizedSecurityId)
        )
      )
      .orderBy(desc(marketTradesTable.createdAt))
      .limit(Math.min(limit, 200));
  }

  const points = trades
    .map((trade) => {
      let priceNum: number = 0;
      try {
        if (trade.priceAfterScaled != null) {
          // Prefer exact closing price after the trade if available
          priceNum = fromFixed(BigInt(trade.priceAfterScaled));
        } else {
          // Fallback to average execution price for legacy rows
          const delta = BigInt(trade.deltaScaled);
          const cost = BigInt(trade.costScaled);
          priceNum = delta !== 0n ? Number(cost) / Number(delta) : 0;
        }
      } catch {
        const delta = BigInt(trade.deltaScaled);
        const cost = BigInt(trade.costScaled);
        priceNum = delta !== 0n ? Number(cost) / Number(delta) : 0;
      }

      return {
        timestamp: trade.createdAt.toISOString(),
        price: Math.abs(priceNum),
        deltaScaled: trade.deltaScaled,
        costScaled: trade.costScaled,
      };
    })
    .reverse();

  if (includeBaseline && points.length > 0) {
    try {
      const oldest = points[0];
      const cutoff = new Date(oldest.timestamp);
      const cutoffMs = cutoff.getTime() - 1;
      const cutoffDate = new Date(cutoffMs);
      const { structure, securities } = await buildStructureFromDoc(canonicalId);
      const totalsRows = await db
        .select({
          securityId: marketTradesTable.securityId,
          deltaScaled: marketTradesTable.deltaScaled,
          createdAt: marketTradesTable.createdAt,
        })
        .from(marketTradesTable)
        .where(and(eq(marketTradesTable.docId, canonicalId), lt(marketTradesTable.createdAt, cutoffDate)));
      const totals = new Map<string, bigint>();
      for (const sec of securities) totals.set(sec, 0n);
      for (const r of totalsRows) {
        const id = normalize(r.securityId);
        if (!new Set(securities).has(id)) continue;
        try {
          totals.set(id, (totals.get(id) || 0n) + BigInt(r.deltaScaled || "0"));
        } catch {}
      }
      const mm = createMarketMaker(structure, defaultB as any, securities);
      for (const sec of securities) mm.setShares(sec, totals.get(sec) || 0n);
      const baselinePrices = mm.getPrices();
      const base = Number(baselinePrices?.[normalizedSecurityId] || 0);
      if (Number.isFinite(base) && base > 0) {
        points.unshift({
          timestamp: cutoffDate.toISOString(),
          price: base,
          deltaScaled: "0",
          costScaled: "0",
        });
      }
    } catch {}
  }

  return points;
}
