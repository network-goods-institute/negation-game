import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { stanceComputationPipeline } from "@/actions/analytics/stanceComputationPipeline";
import { isUserSiteAdmin } from "@/utils/adminUtils";

export async function POST(request: NextRequest) {
  try {
    // Check for cron job authentication first
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`;
    
    if (!isCronJob) {
      // If not a cron job, require site admin authentication
      const userId = await getUserId();
      if (!userId || !(await isUserSiteAdmin(userId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { snapDay } = body;

    const targetSnapDay = snapDay || new Date().toISOString().slice(0, 10);

    console.log(
      `🔄 [stance-pipeline] Running stance computation pipeline for ${targetSnapDay}`
    );

    const result = await stanceComputationPipeline(targetSnapDay);

    console.log(`✅ [stance-pipeline] Completed with result:`, result);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      snapDay: targetSnapDay,
    });
  } catch (error) {
    console.error("❌ [stance-pipeline] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to run stance computation pipeline",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check for cron job authentication first
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`;
    
    if (!isCronJob) {
      // If not a cron job, require site admin authentication
      const userId = await getUserId();
      if (!userId || !(await isUserSiteAdmin(userId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const snapDay =
      searchParams.get("snapDay") || new Date().toISOString().slice(0, 10);

    console.log(
      `🔄 [stance-pipeline] Running stance computation pipeline for ${snapDay}`
    );

    const result = await stanceComputationPipeline(snapDay);

    console.log(`✅ [stance-pipeline] Completed with result:`, result);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      snapDay,
    });
  } catch (error) {
    console.error("❌ [stance-pipeline] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to run stance computation pipeline",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
