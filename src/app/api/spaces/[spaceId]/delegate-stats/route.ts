import { NextRequest, NextResponse } from "next/server";
import { fetchDelegateStats } from "@/actions/statistics/fetchDelegateStats";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;

    if (!spaceId) {
      return NextResponse.json(
        { error: "Space ID is required" },
        { status: 400 }
      );
    }

    const stats = await fetchDelegateStats(spaceId);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("Error fetching delegate stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch delegate statistics" },
      { status: 500 }
    );
  }
}
