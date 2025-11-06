import { db } from "@/services/db";
import { marketTradesTable } from "@/db/tables/marketTradesTable";
import { eq, and, desc } from "drizzle-orm";
import { resolveSlugToId } from "@/utils/slugResolver";

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

  const trades = await db
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

  return trades.map((trade) => {
    const delta = BigInt(trade.deltaScaled);
    const cost = BigInt(trade.costScaled);
    const price = delta !== 0n ? Number(cost) / Number(delta) : 0;

    return {
      timestamp: trade.createdAt.toISOString(),
      price: Math.abs(price),
      deltaScaled: trade.deltaScaled,
      costScaled: trade.costScaled,
    };
  }).reverse();
}
