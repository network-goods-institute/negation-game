"use server";
import { db } from "@/services/db";
import { safeRevalidateTag } from "@/lib/cache/nextCache";
import { marketHoldingsTable } from "@/db/tables/marketHoldingsTable";
import { marketTradesTable } from "@/db/tables/marketTradesTable";
import { marketStateTable } from "@/db/tables/marketStateTable";
import {
  buildStructureFromDoc,
  buildStructureFromDocUncached,
} from "@/actions/market/buildStructureFromDoc";
import { createMarketMaker, defaultB } from "@/lib/carroll/market";
import { createStructure, buildSecurities } from "@/lib/carroll/structure";
import { and, eq, sql } from "drizzle-orm";
import { resolveSlugToId } from "@/utils/slugResolver";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";
import { getUserId } from "@/actions/users/getUserId";
import { logger } from "@/lib/logger";
import { ensureSecurityInDoc } from "@/actions/market/ensureSecurityInDoc";

const normalize = (id: string) =>
  id?.startsWith("anchor:") ? id.slice("anchor:".length) : id;

export async function buyShares(
  docId: string,
  securityId: string,
  deltaScaled: string
) {
  const userId = await (async () => {
    try {
      const u = await getUserId();
      return u || (await getUserIdOrAnonymous());
    } catch {
      return await getUserIdOrAnonymous();
    }
  })();

  const delta = BigInt(deltaScaled);
  const canonicalId = await resolveSlugToId(docId);
  const normalized = normalize(securityId);

  let { structure, securities } = await buildStructureFromDoc(canonicalId);
  let secSet = new Set(securities);

  const isKnownName =
    Array.isArray((structure as any)?.names) &&
    (structure as any).names.includes(normalized);
  const isKnownEdge =
    Array.isArray((structure as any)?.edges) &&
    (structure as any).edges.some((e: any) => e?.name === normalized);

  if (isKnownName || isKnownEdge) {
    try {
      await ensureSecurityInDoc(canonicalId, normalized);
    } catch {}
    if (!secSet.has(normalized)) {
      const rebuilt = await buildStructureFromDocUncached(canonicalId);
      structure = rebuilt.structure;
      securities = rebuilt.securities;
      secSet = new Set(securities);
    }
  }

  if (!secSet.has(normalized)) {
    const looksLikeNode = /^(p-|s-|c-|group-)/.test(normalized);
    const looksLikeEdge =
      normalized.startsWith("edge:") && normalized.includes("->");

    try {
      logger.info?.("[market] buyShares detect", {
        docId: canonicalId,
        normalized,
        looksLikeNode,
        looksLikeEdge,
        securitiesCount: securities.length,
      });
    } catch {}

    if (looksLikeNode || looksLikeEdge) {
      const edgeTriples = (structure.edges as any[]).map(
        (e: any) => [e.name, e.from, e.to] as [string, string, string]
      );
      const augNodes = new Set<string>([
        ...(structure.nodes as any as string[]),
      ]);
      const augEdges = new Set<string>(edgeTriples.map((t) => t[0]));
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
            }
          }
        } catch {}
      }

      const augStructure = createStructure(Array.from(augNodes), triples);
      const augSecurities = buildSecurities(augStructure, {
        includeNegations: "all",
      });
      structure = augStructure;
      securities = augSecurities;
      secSet = new Set(securities);
    } else {
      const augStructure = createStructure([normalized], []);
      const augSecurities = buildSecurities(augStructure, {
        includeNegations: "all",
      });
      structure = augStructure;
      securities = augSecurities;
      secSet = new Set(securities);
    }
  }

  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`INSERT INTO market_state (doc_id, version, updated_at) VALUES (${canonicalId}, 0, NOW()) ON CONFLICT (doc_id) DO NOTHING`
    );
    await tx.execute(
      sql`SELECT 1 FROM market_state WHERE doc_id = ${canonicalId} FOR UPDATE`
    );

    const rows = (await tx
      .select({
        securityId: marketHoldingsTable.securityId,
        amountScaled: marketHoldingsTable.amountScaled,
      })
      .from(marketHoldingsTable)
      .where(eq(marketHoldingsTable.docId, canonicalId))) as Array<{
      securityId: string;
      amountScaled: string;
    }>;

    const totals = new Map<string, bigint>();
    for (const sec of securities) totals.set(sec, 0n);
    for (const r of rows) {
      const id = normalize(r.securityId);
      if (!secSet.has(id)) continue;
      totals.set(id, (totals.get(id) || 0n) + BigInt(r.amountScaled || "0"));
    }

    const mm = createMarketMaker(structure, defaultB as any, securities, {
      enumerationCap: 1 << 19,
    });
    for (const sec of securities) mm.setShares(sec, totals.get(sec) || 0n);

    let pricesBeforeFixed: Record<string, bigint> = {};
    try {
      const pf = (mm as any).getPricesFixed?.();
      if (pf && typeof pf === "object")
        pricesBeforeFixed = pf as Record<string, bigint>;
    } catch {}

    const cost = mm.buyShares(normalized, delta);

    let priceAfterFixed: bigint | undefined;
    let priceAfter: number | undefined;
    try {
      const pf = (mm as any).getPricesFixed?.();
      priceAfterFixed = pf?.[normalized];
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
      costScaled: (cost as unknown as bigint).toString(),
      ...(priceAfterFixed != null
        ? { priceAfterScaled: priceAfterFixed.toString() }
        : {}),
    });

    try {
      const after = (mm as any).getPricesFixed?.() as
        | Record<string, bigint>
        | undefined;
      if (after && typeof after === "object") {
        const diffs = Object.keys(after)
          .filter((sec) => sec !== normalized)
          .filter((sec) => (pricesBeforeFixed[sec] ?? null) !== after[sec]);
        if (diffs.length > 0) {
          const syntheticRows = diffs.map((sec) => ({
            docId: canonicalId,
            userId,
            securityId: sec,
            deltaScaled: "0",
            costScaled: "0",
            priceAfterScaled: String(after[sec] ?? 0n),
          }));
          await tx.insert(marketTradesTable).values(syntheticRows as any);
        }
      }
    } catch {}

    try {
      logger.info?.("[market] buyShares", {
        docId: canonicalId,
        userId,
        securityId: normalized,
        delta: delta.toString(),
        cost: (cost as unknown as bigint).toString(),
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

    return { cost: (cost as unknown as bigint).toString() };
  });

  safeRevalidateTag(`market-view:${canonicalId}`);
  safeRevalidateTag(`market-structure:${canonicalId}`);

  return result;
}
