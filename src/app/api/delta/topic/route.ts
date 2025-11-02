import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { handleTopicComparison } from "@/services/delta/deltaComparison";import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { referenceUserId, topicId, snapDay, limit = 20 } = body;

    if (!referenceUserId || !topicId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const topicIdNum = Number(topicId);
    if (isNaN(topicIdNum)) {
      logger.error("[/api/delta/topic] Invalid topicId:", topicId);
      return NextResponse.json({ error: "Invalid topic ID" }, { status: 400 });
    }

    // Authorization: User must be the reference user in the comparison
    if (userId !== referenceUserId) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: You can only request topic comparisons where you are the reference user",
        },
        { status: 403 }
      );
    }

    const result = await handleTopicComparison({
      referenceUserId,
      topicId: topicIdNum,
      snapDay: snapDay || new Date().toISOString().slice(0, 10),
      limit,
      requestingUserId: userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[/api/delta/topic] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute topic delta comparison" },
      { status: 500 }
    );
  }
}
