import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/actions/market/getPriceHistory";

export async function POST(
  req: NextRequest,
  ctx: any
) {
  try {
    const body = await req.json();
    const { securityId, limit } = body;

    if (!securityId || typeof securityId !== "string") {
      return NextResponse.json({ error: "securityId required" }, { status: 400 });
    }

    const raw = ctx?.params;
    const { docId } = raw && typeof raw.then === "function" ? await raw : (raw as { docId: string });
    const history = await getPriceHistory(docId, securityId, limit);
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get price history" },
      { status: 500 }
    );
  }
}
