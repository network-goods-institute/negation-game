import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { handleSpaceComparison } from "@/services/delta/deltaComparison";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { referenceUserId, spaceId, snapDay, limit = 20 } = body;

    if (!referenceUserId || !spaceId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Authorization: User must be the reference user in the comparison
    if (userId !== referenceUserId) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: You can only request space comparisons where you are the reference user",
        },
        { status: 403 }
      );
    }

    const result = await handleSpaceComparison({
      referenceUserId,
      spaceId,
      snapDay: snapDay || new Date().toISOString().slice(0, 10),
      limit,
      requestingUserId: userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/delta/space] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute space delta comparison" },
      { status: 500 }
    );
  }
}
