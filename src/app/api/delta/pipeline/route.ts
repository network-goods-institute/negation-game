import { NextRequest, NextResponse } from "next/server";
import {
  runDailyDeltaPipeline,
  runDeltaPipelineForDateRange,
} from "@/actions/analytics/runDailyDeltaPipeline";
import { getUserId } from "@/actions/users/getUserId";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    console.error("[/api/delta/pipeline] Error:", error);
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
  try {
    const url = new URL(request.url);
    const snapDay =
      url.searchParams.get("snapDay") || new Date().toISOString().slice(0, 10);

    // Check if this is a cron job call (Vercel sets specific headers)
    const isCronJob =
      request.headers.get("user-agent")?.includes("vercel-cron") ||
      request.headers.get("x-vercel-cron") === "1";

    // For manual calls, require authentication
    if (!isCronJob) {
      const userId = await getUserId();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log(
      `[/api/delta/pipeline] Running pipeline for ${snapDay} ${isCronJob ? "(cron job)" : "(manual)"}`
    );

    const result = await runDailyDeltaPipeline(snapDay);

    // Log results for monitoring
    if (result.success) {
      console.log(
        `[/api/delta/pipeline] Pipeline completed successfully for ${snapDay}`
      );
    } else {
      console.error(
        `[/api/delta/pipeline] Pipeline failed for ${snapDay}: ${result.message}`
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/delta/pipeline] Error:", error);
    return NextResponse.json(
      {
        error: "Pipeline execution failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
