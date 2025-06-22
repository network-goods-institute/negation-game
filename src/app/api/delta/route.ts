import { NextRequest, NextResponse } from "next/server";
import { computeDelta } from "@/actions/analytics/computeDelta";
import { getUserId } from "@/actions/users/getUserId";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userAId, userBId, rootPointId, snapDay } = body;

    if (!userAId || !userBId || !rootPointId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const result = await computeDelta({
      userAId,
      userBId,
      rootPointId: Number(rootPointId),
      snapDay,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/delta] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute delta" },
      { status: 500 }
    );
  }
}
