import { NextRequest, NextResponse } from "next/server";
import { computeContestedPoints } from "@/actions/analytics/computeContestedPoints";
import { getUserId } from "@/actions/users/getUserId";
import { checkRateLimitStrict } from "@/lib/rateLimit";import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimitStrict(
      userId,
      10,
      60000,
      "analytics"
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. Analytics limited to 10 requests per minute.",
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const snapDay = searchParams.get("snapDay") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 10;

    const points = await computeContestedPoints({ snapDay, limit });

    return NextResponse.json({ points });
  } catch (error) {
    logger.error("[/api/analytics/contested] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute contested points" },
      { status: 500 }
    );
  }
}
