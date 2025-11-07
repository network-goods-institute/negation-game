import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { marketHoldingsTable } from "@/db/tables/marketHoldingsTable";
import { buildStructureFromDoc } from "@/actions/market/buildStructureFromDoc";
import { createMarketMaker, defaultB } from "@/lib/carroll/market";
import { eq, sql } from "drizzle-orm";
import { resolveSlugToId } from "@/utils/slugResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: any) {
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

  const canonicalId = await resolveSlugToId(docId);
  const { structure, securities } = await buildStructureFromDoc(canonicalId);

  // Ensure state row exists to align with pricing versioning; no locking needed for preview
  await db.execute(
    sql`INSERT INTO market_state (doc_id, version, updated_at) VALUES (${canonicalId}, 0, NOW()) ON CONFLICT (doc_id) DO NOTHING`
  );

  const rows = await db
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
    enumerationCap: 1 << 19,
  });
  for (const sec of securities) mm.setShares(sec, totals.get(sec) || 0n);

  const normalized = normalize(securityId);

  if (!totals.has(normalized)) {
    // Augment structure if the requested security is not yet present (node/edge just created)
    const looksLikeNode = /^(p-|s-|c-|group-)/.test(normalized);
    const looksLikeEdge = normalized.startsWith("edge:") && normalized.includes("->");
    if (looksLikeNode || looksLikeEdge) {
      const edgeTriples = (structure.edges as any[]).map((e: any) => [
        e.name,
        e.from,
        e.to,
      ]) as [string, string, string][];
      let augNodes = new Set<string>([...(structure.nodes as any as string[])]);
      let augEdges = new Set<string>(edgeTriples.map((t) => t[0]));
      const triples: [string, string, string][] = [...edgeTriples];
      if (looksLikeNode) {
        augNodes.add(normalized);
      } else if (looksLikeEdge) {
        try {
          const rawId = normalized.slice("edge:".length);
          const [left, right] = rawId.split("->");
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
      for (const sec of augSecurities) augTotals.set(sec, totals.get(sec) || 0n);
      augTotals.set(normalized, augTotals.get(normalized) || 0n);
      mm = createMarketMaker(augStructure, defaultB, augSecurities, {
        enumerationCap: 1 << 19,
      });
      for (const sec of augSecurities) mm.setShares(sec, augTotals.get(sec) || 0n);
    }
  }

  // Snapshot price before and simulate buy without persisting
  let priceBefore: number | undefined;
  try {
    priceBefore = mm.getPrices()?.[normalized];
  } catch {}
  const spend = BigInt(spendScaled);
  const { shares, cost } = mm.buyAmount(normalized, spend);
  let priceAfter: number | undefined;
  try {
    priceAfter = mm.getPrices()?.[normalized];
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
}


