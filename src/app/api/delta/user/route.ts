import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { handleUserComparison } from "@/services/delta/deltaComparison";import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { referenceUserId, targetUserId, snapDay, limit = 20 } = body;

    if (!referenceUserId || !targetUserId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Authorization: User must be the reference user in the comparison
    if (userId !== referenceUserId) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: You can only request comparisons where you are the reference user",
        },
        { status: 403 }
      );
    }

    const result = await handleUserComparison({
      referenceUserId,
      targetUserId,
      snapDay: snapDay || new Date().toISOString().slice(0, 10),
      limit,
      requestingUserId: userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[/api/delta/user] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute user delta comparison" },
      { status: 500 }
    );
  }
}
