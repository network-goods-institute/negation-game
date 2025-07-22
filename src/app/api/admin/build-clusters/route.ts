import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { isUserSiteAdmin } from "@/utils/adminUtils";
import {
  buildMissingPointClusters,
  buildPointClustersBatch,
  getClusterCoverageStats,
} from "@/actions/points/buildPointClustersBatch";

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId || !(await isUserSiteAdmin(userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get("spaceId") || undefined;

    const stats = await getClusterCoverageStats(spaceId);

    return NextResponse.json({
      ...stats,
      message: "Cluster coverage statistics retrieved",
      spaceId: spaceId || "all",
    });
  } catch (error) {
    console.error("[build-clusters] Error getting stats:", error);
    return NextResponse.json(
      { error: "Failed to get cluster statistics" },
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
    const { action, limit = 100, spaceId, pointIds } = body;

    switch (action) {
      case "build-missing":
        console.log(
          `[build-clusters] Building missing clusters${spaceId ? ` for space ${spaceId}` : ""}, limit: ${limit}`
        );

        const stats = await buildMissingPointClusters({
          limit: Math.min(limit, 1000),
          spaceId,
        });

        return NextResponse.json({
          action: "build-missing",
          ...stats,
          message: `Built ${stats.newClusters} new clusters in ${stats.processingTime}ms`,
          spaceId: spaceId || "all",
        });

      case "build-specific":
        if (!pointIds || !Array.isArray(pointIds)) {
          return NextResponse.json(
            { error: "pointIds array is required for build-specific action" },
            { status: 400 }
          );
        }

        console.log(
          `[build-clusters] Building clusters for ${pointIds.length} specific points`
        );

        const specificStats = await buildPointClustersBatch(pointIds);

        return NextResponse.json({
          action: "build-specific",
          ...specificStats,
          message: `Built ${specificStats.newClusters} new clusters for ${pointIds.length} points in ${specificStats.processingTime}ms`,
          pointIds,
        });

      case "stats":
        const coverageStats = await getClusterCoverageStats(spaceId);
        return NextResponse.json({
          action: "stats",
          ...coverageStats,
          message: "Cluster coverage statistics retrieved",
          spaceId: spaceId || "all",
        });

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Use 'build-missing', 'build-specific', or 'stats'",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[build-clusters] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to perform cluster operation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
