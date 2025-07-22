import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { isUserSiteAdmin } from "@/utils/adminUtils";
import {
  buildMissingPointClusters,
  getClusterCoverageStats,
} from "@/actions/points/buildPointClustersBatch";

// Serverless runtime configuration for cron jobs
export const runtime = "nodejs";
export const maxDuration = 900; // 15 minutes for cluster building

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const spaceId = url.searchParams.get("spaceId") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    // Check for proper cron authentication using Vercel's authorization header
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isCronJob =
      cronSecret &&
      authHeader === `Bearer ${cronSecret}` &&
      (request.headers.get("user-agent")?.includes("vercel-cron") ||
        request.headers.get("x-vercel-cron") === "1");

    // For manual calls or invalid cron auth, require site admin authentication
    if (!isCronJob) {
      const userId = await getUserId();
      if (!userId || !(await isUserSiteAdmin(userId))) {
        console.warn("[cluster-builder] Unauthorized access attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      console.log(`[cluster-builder] Manual execution by site admin ${userId}`);
    } else {
      console.log(
        `[cluster-builder] Cron job execution started${spaceId ? ` for space ${spaceId}` : ""}`
      );
    }

    // Get initial coverage stats
    const initialStats = await getClusterCoverageStats(spaceId);
    console.log(
      `[cluster-builder] Initial coverage: ${initialStats.clusteredPoints}/${initialStats.totalPoints} points (${initialStats.coverage.toFixed(1)}%)`
    );

    // Build missing clusters (limited batch to avoid timeouts)
    const result = await buildMissingPointClusters({
      limit: Math.min(limit, 100), // Cap at 100 for safety
      spaceId,
    });

    // Get final coverage stats
    const finalStats = await getClusterCoverageStats(spaceId);

    const duration = Date.now() - startTime;

    // Enhanced logging for monitoring
    console.log(
      `[cluster-builder] Job completed in ${duration}ms ${isCronJob ? "(cron)" : "(manual)"}`
    );
    console.log(`[cluster-builder] Results:`, {
      built: result.newClusters,
      failed: result.failed,
      processed: result.totalPoints,
      coverage: {
        before: `${initialStats.clusteredPoints}/${initialStats.totalPoints} (${initialStats.coverage.toFixed(1)}%)`,
        after: `${finalStats.clusteredPoints}/${finalStats.totalPoints} (${finalStats.coverage.toFixed(1)}%)`,
        improvement: `+${finalStats.clusteredPoints - initialStats.clusteredPoints} points`,
      },
      performance: {
        duration,
        pointsPerSecond:
          result.totalPoints > 0
            ? (result.totalPoints / (duration / 1000)).toFixed(2)
            : "0",
      },
    });

    const response = {
      success: true,
      message: `Built ${result.newClusters} new clusters`,
      buildStats: result,
      coverage: {
        initial: initialStats,
        final: finalStats,
        improvement: finalStats.clusteredPoints - initialStats.clusteredPoints,
      },
      execution: {
        duration,
        trigger: isCronJob ? "cron" : "manual",
        timestamp: new Date().toISOString(),
        spaceId: spaceId || "all",
        limit,
      },
    };

    if (result.failed > 0) {
      console.warn(`[cluster-builder] ${result.failed} cluster builds failed`);
    }

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[cluster-builder] Unexpected error after ${duration}ms:`,
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Cluster building failed",
        details: error instanceof Error ? error.message : String(error),
        execution: {
          duration,
          trigger: "unknown",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check for proper cron authentication
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`;

    // For manual calls, require site admin authentication
    if (!isCronJob) {
      const userId = await getUserId();
      if (!userId || !(await isUserSiteAdmin(userId))) {
        console.warn("[cluster-builder] Unauthorized POST attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      console.log(`[cluster-builder] Manual POST execution by site admin ${userId}`);
    }

    const body = await request.json();
    const { spaceId, limit = 50 } = body;

    console.log(
      `[cluster-builder] POST execution${spaceId ? ` for space ${spaceId}` : ""}, limit: ${limit}`
    );

    // Get initial coverage stats
    const initialStats = await getClusterCoverageStats(spaceId);

    // Build missing clusters
    const result = await buildMissingPointClusters({
      limit: Math.min(limit, 200), // Higher limit for manual execution
      spaceId,
    });

    // Get final coverage stats
    const finalStats = await getClusterCoverageStats(spaceId);

    const duration = Date.now() - startTime;

    console.log(
      `[cluster-builder] POST completed in ${duration}ms: ${result.newClusters} built, ${result.failed} failed`
    );

    return NextResponse.json({
      success: true,
      message: `Built ${result.newClusters} new clusters`,
      buildStats: result,
      coverage: {
        initial: initialStats,
        final: finalStats,
        improvement: finalStats.clusteredPoints - initialStats.clusteredPoints,
      },
      execution: {
        duration,
        trigger: isCronJob ? "cron" : "manual",
        timestamp: new Date().toISOString(),
        spaceId: spaceId || "all",
        limit,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[cluster-builder] POST error after ${duration}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Cluster building failed",
        details: error instanceof Error ? error.message : String(error),
        execution: {
          duration,
          trigger: "unknown",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
