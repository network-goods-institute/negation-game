import { NextRequest, NextResponse } from "next/server";
import { computeUsersDaoAlignment } from "@/actions/analytics/computeUsersDaoAlignment";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const snapDay = searchParams.get("snapDay") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 10;

    const data = await computeUsersDaoAlignment({ snapDay, limit });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[/api/analytics/users-alignment] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
