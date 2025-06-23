import { NextRequest } from "next/server";
import { db } from "@/services/db";
import { currentPointFavorView, pointsWithDetailsView } from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { eq } from "drizzle-orm";
import { fetchFavorHistory } from "@/actions/feed/fetchFavorHistory";

export async function GET(request: NextRequest) {
  const pointId = request.nextUrl.searchParams.get("pointId");

  if (!pointId) {
    return Response.json(
      { error: "Missing pointId parameter" },
      { status: 400 }
    );
  }

  const pointIdNum = parseInt(pointId);
  if (isNaN(pointIdNum)) {
    return Response.json(
      { error: "Invalid pointId parameter" },
      { status: 400 }
    );
  }

  try {
    const [point] = await db
      .select()
      .from(pointsWithDetailsView)
      .where(eq(pointsWithDetailsView.pointId, pointIdNum))
      .limit(1);

    if (!point) {
      return Response.json({ error: "Point not found" }, { status: 404 });
    }

    // Get current favor (no need for history)
    const [favorData] = await db
      .select({
        favor: currentPointFavorView.favor,
      })
      .from(currentPointFavorView)
      .where(eq(currentPointFavorView.pointId, pointIdNum))
      .limit(1);

    const favor = favorData?.favor ?? 0;

    // Also get using addFavor for consistency
    const [pointWithFavor] = await addFavor([{ id: point.pointId }]);

    // Fetch favor history (default 1W scale for OG images)
    const favorHistory = await fetchFavorHistory({
      pointId: point.pointId,
      scale: "1W",
    });

    // Map DB snake_case fields to camelCase expected by the OG image route
    const responsePayload = {
      id: point.pointId,
      content: point.content,
      createdAt: point.createdAt,
      favor: pointWithFavor.favor,
      favorHistory,
      amountSupporters:
        (point as any).amountSupporters ??
        (point as any).amount_supporters ??
        0,
      amountNegations:
        (point as any).amountNegations ?? (point as any).amount_negations ?? 0,
      cred: point.cred,
    };

    return Response.json(responsePayload);
  } catch (error) {
    console.error("Error fetching point data:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
