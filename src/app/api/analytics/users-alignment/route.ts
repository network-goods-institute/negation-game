import { NextRequest, NextResponse } from "next/server";
import { computeUsersDaoAlignment } from "@/actions/analytics/computeUsersDaoAlignment";
import { getUserId } from "@/actions/users/getUserId";
import { checkRateLimitStrict } from "@/lib/rateLimit";

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
    const spaceId = searchParams.get("spaceId") || undefined;

    const data = await computeUsersDaoAlignment({ snapDay, limit, spaceId });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[/api/analytics/users-alignment] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
