import { NextResponse } from "next/server";
import { buyShares } from "@/actions/market/buyShares";

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
  const deltaScaled = String(json?.deltaScaled || "0");
  if (!securityId) return NextResponse.json({ error: "securityId required" }, { status: 400 });
  const res = await buyShares(docId, securityId, deltaScaled);
  return NextResponse.json(res, { status: 200 });
}

