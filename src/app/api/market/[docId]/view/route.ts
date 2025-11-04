import { NextResponse } from "next/server";
import { getMarketView } from "@/actions/market/getMarketView";
import { getMarketViewFromStructure } from "@/actions/market/getMarketViewFromStructure";
import { getUserIdOrAnonymous } from "@/actions/users/getUserIdOrAnonymous";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const raw = ctx?.params;
  const { docId } = raw && typeof raw.then === "function" ? await raw : (raw as { docId: string });
  const userId = await getUserIdOrAnonymous();
  const view = await getMarketView(docId, userId || undefined);
  return NextResponse.json(view, { status: 200 });
}

export async function POST(req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const raw = ctx?.params;
  const { docId } = raw && typeof raw.then === "function" ? await raw : (raw as { docId: string });
  const userId = await getUserIdOrAnonymous();
  let body: any = null;
  try { body = await req.json(); } catch {}
  const nodes: string[] = Array.isArray(body?.nodes) ? body.nodes.map((x: any) => String(x)) : [];
  const edges: Array<{ id: string; source: string; target: string }> = Array.isArray(body?.edges) ? body.edges.map((e: any) => ({ id: String(e?.id || ''), source: String(e?.source || ''), target: String(e?.target || '') })) : [];
  const view = await getMarketViewFromStructure(docId, userId || undefined, { nodes, edges });
  return NextResponse.json(view, { status: 200 });
}
