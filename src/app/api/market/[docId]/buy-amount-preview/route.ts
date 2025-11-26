import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { marketHoldingsTable } from "@/db/tables/marketHoldingsTable";
import { buildStructureFromDoc } from "@/actions/market/buildStructureFromDoc";
import { getUserId } from "@/actions/users/getUserId";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";
import { createMarketMaker, defaultB } from "@/lib/carroll/market";
import { eq, sql } from "drizzle-orm";
import { resolveSlugToId } from "@/utils/slugResolver";
import { logger } from "@/lib/logger";
import { fromFixed } from "@/lib/carroll/fixed";
import { buildSecurities } from "@/lib/carroll/structure";
import { createStructureWithSupports } from "@/actions/market/structureUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalizeId = (id: string) =>
  id?.startsWith("anchor:") ? id.slice("anchor:".length) : id;

const parseEdgeId = (edgeId: string) => {
  if (!edgeId.startsWith("edge:") || !edgeId.includes("->")) return null;
  try {
    const raw = edgeId.slice("edge:".length);
    const [left, right] = raw.split("->");
    const leftParts = left.split(":");
    const srcId = leftParts.length >= 2 ? leftParts[1] : "";
    const tgtId = right.split(":")[0] || "";
    if (srcId && tgtId) return { srcId, tgtId };
  } catch {}
  return null;
};

export async function POST(req: Request, ctx: any) {
  try {
    if (process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED !== "true") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const raw = ctx?.params;
    const { docId } =
      raw && typeof raw.then === "function" ? await raw : (raw as { docId: string });
    const json = await req.json().catch(() => ({}));
    const securityId = String(json?.securityId || "");
    const spendScaled = String(json?.spendScaled || "0");
    if (!securityId) {
      return NextResponse.json({ error: "securityId required" }, { status: 400 });
    }
    const rawSecurityId = securityId;

    const userId = await (async () => {
      try {
        const u = await getUserId();
        return u || (await getUserIdOrAnonymous());
      } catch {
        return await getUserIdOrAnonymous();
      }
    })();

    const canonicalId = await resolveSlugToId(docId);
    let { structure, securities } = await buildStructureFromDoc(canonicalId);

    await db.execute(
      sql`INSERT INTO market_state (doc_id, version, updated_at) VALUES (${canonicalId}, 0, NOW()) ON CONFLICT (doc_id) DO NOTHING`
    );

    const rows = await db
      .select({
        securityId: marketHoldingsTable.securityId,
        amountScaled: marketHoldingsTable.amountScaled,
        userId: marketHoldingsTable.userId,
      })
      .from(marketHoldingsTable)
      .where(eq(marketHoldingsTable.docId, canonicalId));

    const rebuildMaps = () => {
      const totals = new Map<string, bigint>();
      const userTotals = new Map<string, bigint>();
      for (const sec of securities) {
        totals.set(sec, 0n);
        userTotals.set(sec, 0n);
      }
      for (const r of rows) {
        const id = normalizeId(r.securityId);
        if (!totals.has(id)) continue;
        totals.set(id, (totals.get(id) || 0n) + BigInt(r.amountScaled || "0"));
        if (r.userId === userId) {
          userTotals.set(id, (userTotals.get(id) || 0n) + BigInt(r.amountScaled || "0"));
        }
      }
      return { totals, userTotals };
    };

    let { totals, userTotals } = rebuildMaps();

    const ensureMaker = () => {
      const maker = createMarketMaker(structure, defaultB, securities, {
        enumerationCap: 1 << 19,
      });
      for (const sec of securities) maker.setShares(sec, totals.get(sec) || 0n);
      return maker;
    };

    const normalized = normalizeId(securityId);
    const isNegatedRequest = normalized.startsWith("not");
    const baseId = isNegatedRequest ? normalized.slice(3) : normalized;

    const augmentOnce = () => {
      const edgeTriples = (structure.edges as any[]).map(
        (e: any) => [e.name, e.from, e.to] as [string, string, string]
      );
      const supportTriples = ((structure as any).supportEdges || []).map(
        (e: any) => [e.name, e.from, e.to] as [string, string, string]
      );
      const nodeSet = new Set<string>(structure.nodes as any as string[]);
      const edgeSet = new Set<string>(edgeTriples.map(([n]) => n));

      if (normalized.startsWith("edge:") && !edgeSet.has(normalized)) {
        const parsed = parseEdgeId(normalized);
        if (parsed) {
          nodeSet.add(parsed.srcId);
          nodeSet.add(parsed.tgtId);
          edgeTriples.push([normalized, parsed.srcId, parsed.tgtId]);
        }
      } else {
        nodeSet.add(baseId);
      }

      structure = createStructureWithSupports(
        Array.from(nodeSet),
        edgeTriples,
        supportTriples
      );
      securities = buildSecurities(structure, { includeNegations: "all" });
      ({ totals, userTotals } = rebuildMaps());
    };

    if (!new Set(securities).has(normalized)) {
      logger.info?.("[buy-amount-preview] augmenting for missing security", {
        docId: canonicalId,
        securityId: normalized,
        rawSecurityId,
        securitiesCount: securities.length,
        names: structure.names?.length,
      });
      augmentOnce();
    }

    if (isNegatedRequest && !new Set(securities).has(normalized) && new Set(structure.names || []).has(baseId)) {
      securities = [...securities, normalized];
      totals.set(normalized, 0n);
      userTotals.set(normalized, 0n);
    }

    if (!new Set(securities).has(normalized)) {
      logger.error?.("[buy-amount-preview] security still missing after augmentation", {
        docId: canonicalId,
        securityId: normalized,
        rawSecurityId,
        securitiesCount: securities.length,
        names: structure.names?.length,
        securities,
      });
      return NextResponse.json({ error: "unknown_security" }, { status: 400 });
    }

    const baseMaker = ensureMaker();

    let priceBefore: number | undefined;
    try {
      priceBefore = baseMaker.getPrices()?.[normalized];
    } catch (e) {
      logger.error?.("[buy-amount-preview] price before failed", {
        docId: canonicalId,
        securityId: normalized,
        securities,
        message: (e as Error)?.message,
      });
    }

    const spend = BigInt(spendScaled);
    logger.info("[buy-amount-preview] calling buyAmount", {
      securityId: normalized,
      rawSecurityId,
      spendScaled,
      spendFloat: fromFixed(spend),
      priceBefore,
    });

    const previewMaker = ensureMaker();
    let preview;
    try {
      preview = previewMaker.buyAmount(normalized, spend);
    } catch (e) {
      logger.error?.("[buy-amount-preview] simulation failed", {
        docId: canonicalId,
        securityId: normalized,
        rawSecurityId,
        securities,
        securitiesCount: securities.length,
        names: structure.names?.length,
        message: (e as Error)?.message,
      });
      return NextResponse.json({ error: "preview_failed" }, { status: 500 });
    }

    let shares = preview.shares;
    const currentHolding = userTotals.get(normalized) || 0n;
    if (spend < 0n && shares < 0n && -shares > currentHolding) {
      shares = -currentHolding;
    }

    const cost =
      spend < 0n && shares !== preview.shares
        ? (() => {
            const clampMaker = ensureMaker();
            return clampMaker.buyShares(normalized, shares);
          })()
        : preview.cost;

    logger.info("[buy-amount-preview] buyAmount result", {
      securityId: normalized,
      sharesRaw: shares.toString(),
      sharesFloat: fromFixed(shares),
      costRaw: cost.toString(),
      costFloat: fromFixed(cost),
      securitiesCount: securities.length,
    });

    let priceAfter: number | undefined;
    try {
      priceAfter = baseMaker.getPrices()?.[normalized];
    } catch {}

    return NextResponse.json(
      {
        shares: shares.toString(),
        cost: cost.toString(),
        priceBefore,
        priceAfter,
      },
      { status: 200 }
    );
  } catch (e) {
    logger.error?.("[buy-amount-preview] unhandled error", {
      message: (e as Error)?.message,
      stack: (e as Error)?.stack,
    });
    return NextResponse.json({ error: "preview_failed" }, { status: 500 });
  }
}

