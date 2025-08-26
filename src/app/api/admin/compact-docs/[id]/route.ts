import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { isUserSiteAdmin } from "@/utils/adminUtils";
import { compactDocUpdates } from "@/services/yjsCompaction";

export const runtime = "nodejs";

export async function GET(request: NextRequest, ctx: any) {
  const userId = await getUserId();
  if (!userId || !(await isUserSiteAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = ctx?.params;
  const { id } = raw && typeof raw.then === "function" ? await raw : (raw as { id: string });
  if (!id || !/^[a-zA-Z0-9:_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const keepLast = parseInt(url.searchParams.get("keepLast") || "0", 10);
    const result = await compactDocUpdates(id, { keepLast });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

