import { db } from "@/services/db";
import { marketTradesTable } from "@/db/tables/marketTradesTable";
import { eq, and, desc } from "drizzle-orm";
import { resolveSlugToId } from "@/utils/slugResolver";
import { fromFixed } from "@/lib/carroll";

export type PricePoint = {
  timestamp: string;
  price: number;
  deltaScaled: string;
  costScaled: string;
};

export async function getPriceHistory(
  docId: string,
  securityId: string,
  limit: number = 50
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

  return trades
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
}
