import { NextResponse } from "next/server";
import { buyAmount } from "@/actions/market/buyAmount";

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
  const spendScaled = String(json?.spendScaled || "0");
  if (!securityId) return NextResponse.json({ error: "securityId required" }, { status: 400 });
  const res = await buyAmount(docId, securityId, spendScaled);
  return NextResponse.json(res, { status: 200 });
}

