import { NextRequest, NextResponse } from "next/server";
import { compactAllDocs } from "@/services/yjsCompaction";

export const runtime = "nodejs";
export const maxDuration = 799;

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronJob =
      cronSecret &&
      authHeader === `Bearer ${cronSecret}` &&
      (request.headers.get("user-agent")?.includes("vercel-cron") ||
        request.headers.get("x-vercel-cron") === "1");

    if (!isCronJob) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const threshold = parseInt(url.searchParams.get("threshold") || "30", 10);
    const keepLast = parseInt(url.searchParams.get("keepLast") || "0", 10);

    const results = await compactAllDocs(threshold, { keepLast });

    const duration = Date.now() - start;
    const summary = {
      docsProcessed: results.length,
      docsCompacted: results.filter((r: any) => r.compacted).length,
      totalUpdatesRemoved: results.reduce(
        (sum: number, r: any) => sum + (r.removedUpdates || 0),
        0
      ),
      totalSizeSaved: results.reduce((sum: number, r: any) => {
        if (r.sizeBefore && r.sizeAfter) return sum + (r.sizeBefore - r.sizeAfter);
        return sum;
      }, 0),
      duration,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, summary, details: results });
  } catch (error) {
    const duration = Date.now() - start;
    return NextResponse.json(
      {
        success: false,
        error: "Compaction cron failed",
        details: error instanceof Error ? error.message : String(error),
        duration,
      },
      { status: 500 }
    );
  }
}
