import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { isUserSiteAdmin } from "@/utils/adminUtils";
import {
  getDeltaCacheStats,
  cleanupDeltaCache,
  deltaCache,
} from "@/lib/deltaCache";import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId || !(await isUserSiteAdmin(userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = getDeltaCacheStats();

    return NextResponse.json({
      ...stats,
      message: "Delta cache statistics retrieved",
    });
  } catch (error) {
    logger.error("[delta-cache] Error getting stats:", error);
    return NextResponse.json(
      { error: "Failed to get cache statistics" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId || !(await isUserSiteAdmin(userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "cleanup":
        const cleared = cleanupDeltaCache();
        return NextResponse.json({
          message: `Cleaned up ${cleared} expired cache entries`,
          cleared,
        });

      case "clear":
        deltaCache.clear();
        return NextResponse.json({
          message: "All cache entries cleared",
        });

      case "stats":
        const stats = getDeltaCacheStats();
        return NextResponse.json({
          ...stats,
          message: "Cache statistics retrieved",
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'cleanup', 'clear', or 'stats'" },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error("[delta-cache] Error:", error);
    return NextResponse.json(
      { error: "Failed to perform cache operation" },
      { status: 500 }
    );
  }
}
