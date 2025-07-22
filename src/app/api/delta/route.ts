import { NextRequest, NextResponse } from "next/server";
import { computeDelta } from "@/actions/analytics/computeDelta";
import { getUserId } from "@/actions/users/getUserId";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(userId, 20, 60000, "delta"); // 20 requests per minute
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Too many delta computation requests.",
          resetTime: rateLimit.resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetTime.toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { userAId, userBId, rootPointId, snapDay } = body;

    // Validate required parameters
    if (!userAId || !userBId || !rootPointId) {
      return NextResponse.json(
        { error: "Missing required parameters: userAId, userBId, rootPointId" },
        { status: 400 }
      );
    }

    if (typeof userAId !== "string" || typeof userBId !== "string") {
      return NextResponse.json(
        { error: "userAId and userBId must be strings" },
        { status: 400 }
      );
    }

    if (userAId === userBId) {
      return NextResponse.json(
        { error: "Cannot compute delta between the same user" },
        { status: 400 }
      );
    }

    const numericPointId = Number(rootPointId);
    if (!Number.isInteger(numericPointId) || numericPointId <= 0) {
      return NextResponse.json(
        { error: "rootPointId must be a positive integer" },
        { status: 400 }
      );
    }

    // Validate snapDay format if provided
    if (snapDay && !/^\d{4}-\d{2}-\d{2}$/.test(snapDay)) {
      return NextResponse.json(
        { error: "snapDay must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Authorization: Requesting user must be one of the users being compared
    if (userId !== userAId && userId !== userBId) {
      return NextResponse.json(
        {
          error: "Unauthorized: You can only compute deltas involving yourself",
        },
        { status: 403 }
      );
    }

    const result = await computeDelta({
      userAId,
      userBId,
      rootPointId: numericPointId,
      snapDay,
    });

    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Limit": "20",
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        "X-RateLimit-Reset": rateLimit.resetTime.toString(),
      },
    });
  } catch (error) {
    console.error("[/api/delta] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute delta" },
      { status: 500 }
    );
  }
}
