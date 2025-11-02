import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { handleBulkComparison } from "@/services/delta/deltaComparison";import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { referenceUserId, rootPointId, snapDay, limit = 20 } = body;

    if (!referenceUserId || !rootPointId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Authorization: User can only request bulk comparisons for themselves
    if (userId !== referenceUserId) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: You can only request bulk comparisons for yourself",
        },
        { status: 403 }
      );
    }

    // Use shared delta comparison service
    const result = await handleBulkComparison({
      referenceUserId,
      rootPointId: Number(rootPointId),
      snapDay: snapDay || new Date().toISOString().slice(0, 10),
      limit,
      requestingUserId: userId,
    });

    const response = NextResponse.json(result);
    response.headers.set("Cache-Control", "public, max-age=300, s-maxage=600"); // 5min client, 10min CDN
    return response;
  } catch (error) {
    logger.error("[/api/delta/bulk] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute bulk deltas" },
      { status: 500 }
    );
  }
}
