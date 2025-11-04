"use server";
import { db } from "@/services/db";
import { marketHoldingsTable } from "@/db/tables/marketHoldingsTable";
import { marketTradesTable } from "@/db/tables/marketTradesTable";
import { marketStateTable } from "@/db/tables/marketStateTable";
import { buildStructureFromDoc } from "@/actions/market/buildStructureFromDoc";
import { createMarketMaker, defaultB } from "@/lib/carroll/market";
import { and, eq, sql } from "drizzle-orm";
import { resolveSlugToId } from "@/utils/slugResolver";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";
import { logger } from "@/lib/logger";

export async function buyShares(
  docId: string,
  securityId: string,
  deltaScaled: string
) {
  const userId = await getUserIdOrAnonymous();
  const delta = BigInt(deltaScaled);
  const canonicalId = await resolveSlugToId(docId);
  const { structure, securities } = await buildStructureFromDoc(canonicalId);

  const result = await db.transaction(async (tx) => {
    // Ensure state row exists and take a row lock to serialize pricing/charging
    await tx.execute(
      sql`INSERT INTO market_state (doc_id, version, updated_at) VALUES (${canonicalId}, 0, NOW()) ON CONFLICT (doc_id) DO NOTHING`
    );
    await tx.execute(
      sql`SELECT 1 FROM market_state WHERE doc_id = ${canonicalId} FOR UPDATE`
    );
    const rows = await tx
      .select({
        securityId: marketHoldingsTable.securityId,
        amountScaled: marketHoldingsTable.amountScaled,
      })
      .from(marketHoldingsTable)
      .where(eq(marketHoldingsTable.docId, canonicalId));
    const normalize = (id: string) =>
      id?.startsWith("anchor:") ? id.slice("anchor:".length) : id;
    const secSet = new Set(securities);
    const totals = new Map<string, bigint>();
    for (const sec of securities) totals.set(sec, 0n);
    for (const r of rows) {
      const id = normalize(r.securityId);
      if (!secSet.has(id)) continue;
      totals.set(id, (totals.get(id) || 0n) + BigInt(r.amountScaled || "0"));
    }
    let mm = createMarketMaker(structure, defaultB, securities, {
      enumerationCap: 1 << 18,
    });
    for (const sec of securities) mm.setShares(sec, totals.get(sec) || 0n);
    const normalized = normalize(securityId);
    if (!totals.has(normalized)) {
      const looksLikeNode = /^(p-|s-|c-|group-)/.test(normalized);
      const looksLikeEdge =
        normalized.startsWith("edge:") && normalized.includes("->");
      if (looksLikeNode || looksLikeEdge) {
        const edgeTriples = (structure.edges as any[]).map((e: any) => [
          e.name,
          e.from,
          e.to,
        ]) as [string, string, string][];
        let augNodes = new Set<string>([
          ...(structure.nodes as any as string[]),
        ]);
        let augEdges = new Set<string>(edgeTriples.map((t) => t[0]));
        const triples: [string, string, string][] = [...edgeTriples];
        if (looksLikeNode) {
          augNodes.add(normalized);
        } else if (looksLikeEdge) {
          try {
            const raw = normalized.slice("edge:".length);
            const [left, right] = raw.split("->");
            const leftParts = left.split(":");
            const srcId = leftParts.length >= 2 ? leftParts[1] : "";
            const tgtId = right.split(":")[0] || "";
            if (srcId && tgtId) {
              augNodes.add(srcId);
              augNodes.add(tgtId);
              if (!augEdges.has(normalized)) {
                triples.push([normalized, srcId, tgtId]);
                augEdges.add(normalized);
              }
            }
          } catch {}
        }
        const { createStructure: mk, buildSecurities: mkSecs } = await import(
          "@/lib/carroll/structure"
        );
        const augStructure = mk(Array.from(augNodes), triples);
        const augSecurities = mkSecs(augStructure, { includeNegations: "all" });
        const augTotals = new Map<string, bigint>();
        for (const sec of augSecurities)
          augTotals.set(sec, totals.get(sec) || 0n);
        augTotals.set(normalized, augTotals.get(normalized) || 0n);
        mm = createMarketMaker(augStructure, defaultB, augSecurities, {
          enumerationCap: 1 << 18,
        });
        for (const sec of augSecurities)
          mm.setShares(sec, augTotals.get(sec) || 0n);
      } else {
        try {
          logger.warn("[market] Unknown security on buyShares", {
            docId,
            userId,
            requested: securityId,
            normalized,
            securitiesCount: securities.length,
            sampleSecurities: securities.slice(0, 10),
          });
        } catch {}
        throw new Error("Unknown security");
      }
    }
    const cost = mm.buyShares(normalized, delta);
    let priceAfter: number | undefined;
    try {
      priceAfter = mm.getPrices()?.[normalized];
    } catch {}

    const existing = await tx
      .select({
        id: marketHoldingsTable.id,
        amountScaled: marketHoldingsTable.amountScaled,
      })
      .from(marketHoldingsTable)
      .where(
        and(
          eq(marketHoldingsTable.docId, canonicalId),
          eq(marketHoldingsTable.userId, userId),
          eq(marketHoldingsTable.securityId, normalized)
        )
      );
    const newAmount =
      (existing[0] ? BigInt(existing[0].amountScaled) : 0n) + delta;
    if (existing[0]) {
      await tx
        .update(marketHoldingsTable)
        .set({ amountScaled: newAmount.toString(), updatedAt: new Date() })
        .where(eq(marketHoldingsTable.id, existing[0].id));
    } else {
      await tx.insert(marketHoldingsTable).values({
        docId: canonicalId,
        userId,
        securityId: normalized,
        amountScaled: newAmount.toString(),
      });
    }
    await tx.insert(marketTradesTable).values({
      docId: canonicalId,
      userId,
      securityId: normalized,
      deltaScaled: delta.toString(),
      costScaled: cost.toString(),
    });
    try {
      logger.info?.("[market] buyShares", {
        docId: canonicalId,
        userId,
        securityId: normalized,
        delta: delta.toString(),
        cost: cost.toString(),
        priceAfter,
        totalsKnown: securities.length,
      });
    } catch {}
    await tx
      .update(marketStateTable)
      .set({
        version: sql`${marketStateTable.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(marketStateTable.docId, canonicalId));
    return { cost: cost.toString() };
  });
  return result;
}
