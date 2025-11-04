import { NextResponse } from "next/server";
import { getUserHoldings } from "@/actions/market/getUserHoldings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const raw = ctx?.params;
  const { docId } = raw && typeof raw.then === "function" ? await raw : (raw as { docId: string });
  const map = await getUserHoldings(docId);
  return NextResponse.json({ holdings: map }, { status: 200 });
}
