import { db } from "@/services/db";
import { marketTradesTable } from "@/db/tables/marketTradesTable";
import { eq, and, desc, lt } from "drizzle-orm";
import { resolveSlugToId } from "@/utils/slugResolver";
import { fromFixed } from "@/lib/carroll";
import { logger } from "@/lib/logger";

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
  } catch (error) {
    logger.warn("[market] priceAfterScaled column missing, falling back", { error });
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
          priceNum = fromFixed(BigInt(trade.priceAfterScaled));
        } else {
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
      const cutoffDate = new Date(new Date(oldest.timestamp).getTime() - 1);

      const baselineRow = await db
        .select({
          priceAfterScaled: marketTradesTable.priceAfterScaled,
          createdAt: marketTradesTable.createdAt,
        })
        .from(marketTradesTable)
        .where(
          and(
            eq(marketTradesTable.docId, canonicalId),
            eq(marketTradesTable.securityId, normalizedSecurityId),
            lt(marketTradesTable.createdAt, cutoffDate)
          )
        )
        .orderBy(desc(marketTradesTable.createdAt))
        .limit(1);

      if (baselineRow.length > 0 && baselineRow[0].priceAfterScaled) {
        const base = fromFixed(BigInt(baselineRow[0].priceAfterScaled));
        if (Number.isFinite(base) && base > 0) {
          points.unshift({
            timestamp: baselineRow[0].createdAt.toISOString(),
            price: base,
            deltaScaled: "0",
            costScaled: "0",
          });
        }
      }
    } catch (error) {
      logger.error("[market] Failed to fetch baseline price", { error, docId, securityId });
    }
  }

  return points;
}
