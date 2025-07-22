import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { handleRationaleComparison } from "@/services/delta/deltaComparison";
import { db } from "@/services/db";
import { viewpointsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { referenceUserId, rationaleId, snapDay, limit = 20 } = body;

    if (!referenceUserId || !rationaleId) {
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
            "Unauthorized: You can only request rationale comparisons where you are the reference user",
        },
        { status: 403 }
      );
    }

    const rationale = await db
      .select({
        id: viewpointsTable.id,
        topicId: viewpointsTable.topicId,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.id, rationaleId))
      .limit(1);

    if (!rationale.length) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        totalEngaged: 0,
        message: "Rationale not found",
      });
    }

    const result = await handleRationaleComparison({
      referenceUserId,
      rationaleId,
      snapDay: snapDay || new Date().toISOString().slice(0, 10),
      limit,
      requestingUserId: userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/delta/rationale] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute rationale delta comparison" },
      { status: 500 }
    );
  }
}
