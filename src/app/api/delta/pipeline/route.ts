import { NextRequest, NextResponse } from "next/server";
import {
  runDailyDeltaPipeline,
  runDeltaPipelineForDateRange,
} from "@/actions/analytics/runDailyDeltaPipeline";
import { getUserId } from "@/actions/users/getUserId";
import { isUserSiteAdmin } from "@/utils/adminUtils";
import { checkRateLimitStrict } from "@/lib/rateLimit";import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 799;

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId || !(await isUserSiteAdmin(userId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimitStrict(
      userId,
      2,
      3600000,
      "delta-pipeline"
    ); // 2 requests per hour
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. Pipeline operations are limited to 2 per hour.",
          resetTime: rateLimit.resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "2",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetTime.toString(),
          },
        }
      );
    }

    const body = await request.json();
    const { snapDay, startDate, endDate } = body;

    if (startDate && endDate) {
      // Date range processing
      const result = await runDeltaPipelineForDateRange(startDate, endDate);
      return NextResponse.json(result);
    } else {
      // Single day processing
      const result = await runDailyDeltaPipeline(snapDay);
      return NextResponse.json(result);
    }
  } catch (error) {
    logger.error("[/api/delta/pipeline] Error:", error);
    return NextResponse.json(
      {
        error: "Pipeline execution failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const url = new URL(request.url);
    const snapDay =
      url.searchParams.get("snapDay") || new Date().toISOString().slice(0, 10);

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
        logger.warn("[delta-pipeline] Unauthorized access attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      logger.log(
        `[delta-pipeline] Manual pipeline execution by site admin ${userId}`
      );
    } else {
      logger.log(`[delta-pipeline] Cron job execution started for ${snapDay}`);
    }

    logger.log(
      `[delta-pipeline] Running pipeline for ${snapDay} ${isCronJob ? "(cron job)" : "(manual)"}`
    );

    const result = await runDailyDeltaPipeline(snapDay);

    const duration = Date.now() - startTime;

    // Enhanced logging for monitoring
    if (result.success) {
      logger.log(
        `[delta-pipeline] Pipeline completed successfully for ${snapDay} in ${duration}ms`
      );
      logger.log(`[delta-pipeline] Pipeline results:`, {
        snapDay,
        results: result.results,
        performance: {
          duration,
          trigger: isCronJob ? "cron" : "manual",
        },
      });
    } else {
      logger.error(
        `[delta-pipeline] Pipeline failed for ${snapDay} after ${duration}ms: ${result.message}`
      );
      logger.error(`[delta-pipeline] Error details:`, result.message);
    }

    return NextResponse.json({
      ...result,
      execution: {
        snapDay,
        duration,
        trigger: isCronJob ? "cron" : "manual",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      `[delta-pipeline] Unexpected error after ${duration}ms:`,
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Pipeline execution failed",
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
