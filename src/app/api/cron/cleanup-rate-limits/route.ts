import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredRateLimits } from "@/lib/rateLimit";
import { getUserId } from "@/actions/users/getUserId";
import { isUserSiteAdmin } from "@/utils/adminUtils";

export const runtime = "nodejs";
export const maxDuration = 799;

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check for proper cron authentication using Vercel's authorization header
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isCronJob =
      cronSecret &&
      authHeader === `Bearer ${cronSecret}` &&
      (request.headers.get("user-agent")?.includes("vercel-cron") ||
        request.headers.get("x-vercel-cron") === "1");

    if (!isCronJob) {
      const userId = await getUserId();
      if (!userId || !(await isUserSiteAdmin(userId))) {
        console.warn("[rate-limit-cleanup] Unauthorized access attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.log(
        `[rate-limit-cleanup] Manual execution by admin user: ${userId}`
      );
    } else {
      console.log("[rate-limit-cleanup] Cron job execution started");
    }

    const deletedCount = await cleanupExpiredRateLimits();

    const duration = Date.now() - startTime;

    console.log(
      `[rate-limit-cleanup] Cleanup completed successfully in ${duration}ms. Deleted ${deletedCount} expired entries.`
    );

    return NextResponse.json({
      success: true,
      message: `Rate limit cleanup completed successfully`,
      deletedCount,
      execution: {
        duration,
        trigger: "cron",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[rate-limit-cleanup] Error after ${duration}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Rate limit cleanup failed",
        details: error instanceof Error ? error.message : String(error),
        execution: {
          duration,
          trigger: "cron",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
