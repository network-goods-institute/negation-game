import { NextRequest, NextResponse } from "next/server";
import { computeContestedPoints } from "@/actions/analytics/computeContestedPoints";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const snapDay = searchParams.get("snapDay") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 10;

    const points = await computeContestedPoints({ snapDay, limit });

    return NextResponse.json({ points });
  } catch (error) {
    console.error("[/api/analytics/contested] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute contested points" },
      { status: 500 }
    );
  }
}
