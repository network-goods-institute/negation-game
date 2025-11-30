import { NextResponse } from "next/server";
import { getHoldingsBreakdown } from "@/actions/market/getHoldingsBreakdown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const raw = ctx?.params;
  const { docId } = raw && typeof raw.then === "function" ? await raw : (raw as { docId: string });
  const json = await req.json().catch(() => ({}));
  const securityId = String(json?.securityId || "");
  if (!securityId) return NextResponse.json({ error: "securityId required" }, { status: 400 });
  const rows = await getHoldingsBreakdown(docId, securityId);
  return NextResponse.json({ rows }, { status: 200 });
}
