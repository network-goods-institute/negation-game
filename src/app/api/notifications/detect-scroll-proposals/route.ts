import { ScrollProposalWorker } from "@/workers/scrollProposalWorker";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isCronJob =
      cronSecret &&
      authHeader === `Bearer ${cronSecret}` &&
      (request.headers.get("user-agent")?.includes("vercel-cron") ||
        request.headers.get("x-vercel-cron") === "1");

    if (!isCronJob) {
      const userId = await getUserId();
      if (!userId) {
        console.warn("[scroll-proposals] Unauthorized access attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      console.log(`[scroll-proposals] Manual execution by user ${userId}`);
    } else {
      console.log("[scroll-proposals] Cron job execution started");
    }

    const result = await ScrollProposalWorker.run();

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(
        `[scroll-proposals] Job completed successfully in ${duration}ms. ${isCronJob ? "(cron)" : "(manual)"}`
      );
      console.log(`[scroll-proposals] Results:`, {
        success: result.success,
        message: result.message,
        lastRun: result.lastRun,
      });

      return NextResponse.json({
        ...result,
        execution: {
          duration,
          trigger: isCronJob ? "cron" : "manual",
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      console.error(
        `[scroll-proposals] Job failed in ${duration}ms: ${result.message}`
      );
      console.error(`[scroll-proposals] Error details:`, result.message);

      return NextResponse.json(
        {
          ...result,
          execution: {
            duration,
            trigger: isCronJob ? "cron" : "manual",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[scroll-proposals] Unexpected error after ${duration}ms:`,
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Scroll proposal detection failed",
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

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isCronJob =
      cronSecret &&
      authHeader === `Bearer ${cronSecret}` &&
      (request.headers.get("user-agent")?.includes("vercel-cron") ||
        request.headers.get("x-vercel-cron") === "1");

    if (isCronJob) {
      console.log("[scroll-proposals] Cron job execution started");

      const result = await ScrollProposalWorker.run();

      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(
          `[scroll-proposals] Cron job completed successfully in ${duration}ms`
        );
        console.log(`[scroll-proposals] Results:`, {
          success: result.success,
          message: result.message,
          lastRun: result.lastRun,
        });

        return NextResponse.json({
          ...result,
          execution: {
            duration,
            trigger: "cron",
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        console.error(
          `[scroll-proposals] Cron job failed in ${duration}ms: ${result.message}`
        );
        console.error(`[scroll-proposals] Error details:`, result.message);

        return NextResponse.json(
          {
            ...result,
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

    // For manual calls, require user authentication and return status
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = ScrollProposalWorker.getStatus();
    console.log(
      `[scroll-proposals] Status check by user ${userId}: ${JSON.stringify(status)}`
    );

    return NextResponse.json({
      ...status,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[scroll-proposals] Error after ${duration}ms:`, error);
    return NextResponse.json(
      {
        error: "Failed to get status or run job",
        details: error instanceof Error ? error.message : String(error),
        execution: {
          duration,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
