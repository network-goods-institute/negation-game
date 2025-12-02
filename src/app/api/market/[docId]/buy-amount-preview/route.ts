import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { marketHoldingsTable } from "@/db/tables/marketHoldingsTable";
import { buildStructureFromDoc } from "@/actions/market/buildStructureFromDoc";
import { getUserId } from "@/actions/users/getUserId";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";
import { createMarketMaker, defaultB } from "@/lib/carroll/market";
import { eq } from "drizzle-orm";
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
      raw && typeof raw.then === "function"
        ? await raw
        : (raw as { docId: string });

    const json = await req.json().catch(() => ({}));
    const securityId = String(json?.securityId || "");
    const spendScaled = String(json?.spendScaled || "0");

    if (!securityId) {
      return NextResponse.json(
        { error: "securityId required" },
        { status: 400 }
      );
    }

    const userId = await (async () => {
      try {
        const u = await getUserId();
        return u || (await getUserIdOrAnonymous());
      } catch {
        return await getUserIdOrAnonymous();
      }
    })();

    const canonicalId = await resolveSlugToId(docId);
    const normalized = normalizeId(securityId);
    const isNegatedRequest = normalized.startsWith("not");
    const baseId = isNegatedRequest ? normalized.slice(3) : normalized;

    let { structure, securities } = await buildStructureFromDoc(canonicalId);
    let secSet = new Set(securities);

    // Only rebuild structure if security is missing
    if (!secSet.has(normalized)) {
      const edgeTriples = (structure.edges as any[]).map(
        (e: any) => [e.name, e.from, e.to] as [string, string, string]
      );
      const supportTriples = ((structure as any).supportEdges || []).map(
        (e: any) => [e.name, e.from, e.to] as [string, string, string]
      );
      const nodeSet = new Set<string>(structure.nodes as any as string[]);

      if (normalized.startsWith("edge:")) {
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
      secSet = new Set(securities);
    }

    if (!secSet.has(normalized)) {
      return NextResponse.json({ error: "unknown_security" }, { status: 400 });
    }

    // Fetch holdings
    const rows = await db
      .select({
        securityId: marketHoldingsTable.securityId,
        amountScaled: marketHoldingsTable.amountScaled,
        userId: marketHoldingsTable.userId,
      })
      .from(marketHoldingsTable)
      .where(eq(marketHoldingsTable.docId, canonicalId));

    // Single pass: initialize totals and aggregate holdings
    const totals = new Map<string, bigint>();
    let currentHolding = 0n;

    // Initialize all securities to 0
    for (const sec of securities) totals.set(sec, 0n);

    // Aggregate in one pass
    for (const r of rows) {
      const id = normalizeId(r.securityId);
      if (!secSet.has(id)) continue;
      const amount = BigInt(r.amountScaled || "0");
      totals.set(id, (totals.get(id) || 0n) + amount);
      if (r.userId === userId && id === normalized) {
        currentHolding += amount;
      }
    }

    // Create single market maker and set all shares at once
    const maker = createMarketMaker(structure, defaultB, securities, {
      enumerationCap: 1 << 19,
    });

    for (const sec of securities) {
      maker.setShares(sec, totals.get(sec) || 0n);
    }

    const priceBefore = maker.getPrices()?.[normalized];
    const spend = BigInt(spendScaled);

    const preview = maker.buyAmount(normalized, spend);
    let shares = preview.shares;
    let cost = preview.cost;

    // Handle selling more than current holdings (clamp)
    if (spend < 0n && shares < 0n && -shares > currentHolding) {
      shares = -currentHolding;
      // Reuse the same maker instead of creating a new one
      // Reset only the modified security to original state
      maker.setShares(normalized, totals.get(normalized) || 0n);
      cost = maker.buyShares(normalized, shares);
    }

    logger.info("[buy-amount-preview] result", {
      securityId: normalized,
      shares: fromFixed(shares),
      cost: fromFixed(cost),
    });

    return NextResponse.json(
      {
        shares: shares.toString(),
        cost: cost.toString(),
        priceBefore,
      },
      { status: 200 }
    );
  } catch (e) {
    logger.error?.("[buy-amount-preview] error", {
      message: (e as Error)?.message,
    });
    return NextResponse.json({ error: "preview_failed" }, { status: 500 });
  }
}
