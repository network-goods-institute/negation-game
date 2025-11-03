import { NextRequest, NextResponse } from "next/server";
import { compactAllDocs } from "@/services/yjsCompaction";
import { getUserId } from "@/actions/users/getUserId";
import { isUserSiteAdmin } from "@/utils/adminUtils";import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId || !(await isUserSiteAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const threshold = parseInt(url.searchParams.get("threshold") || "30", 10);
    const keepLast = parseInt(url.searchParams.get("keepLast") || "0", 10);

    const results = await compactAllDocs(threshold, { keepLast });

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
      errors: results.filter((r: any) => r.error).map((r: any) => ({ docId: r.docId, error: r.error })),
    };

    return NextResponse.json({ success: true, summary, details: results });
  } catch (error) {
    logger.error("Compaction failed:", error);
    return NextResponse.json(
      { error: "Compaction failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId || !(await isUserSiteAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const threshold = parseInt(url.searchParams.get("threshold") || "30", 10);
    const keepLast = parseInt(url.searchParams.get("keepLast") || "0", 10);

    const results = await compactAllDocs(threshold, { keepLast });

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
      errors: results.filter((r: any) => r.error).map((r: any) => ({ docId: r.docId, error: r.error })),
    };

    return NextResponse.json({ success: true, summary, details: results });
  } catch (error) {
    logger.error("Compaction failed:", error);
    return NextResponse.json(
      { error: "Compaction failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
