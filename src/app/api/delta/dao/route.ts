import { NextRequest, NextResponse } from "next/server";
import { computeDaoAlignment } from "@/actions/analytics/computeDaoAlignment";
import { getUserId } from "@/actions/users/getUserId";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(userId, 10, 60000, "analytics");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Analytics limited to 10 requests per minute." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const snapDay = searchParams.get("snapDay") || undefined;
    const samplePairsParam = searchParams.get("samplePairs");
    const samplePairs = samplePairsParam ? Number(samplePairsParam) : undefined;

    const result = await computeDaoAlignment({ snapDay, samplePairs });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/delta/dao] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute DAO alignment" },
      { status: 500 }
    );
  }
}
