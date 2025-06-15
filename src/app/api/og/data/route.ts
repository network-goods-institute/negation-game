import { NextRequest } from "next/server";
import { db } from "@/services/db";
import { currentPointFavorView, pointsWithDetailsView } from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { eq } from "drizzle-orm";

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

    return Response.json({
      point: {
        ...point,
        favor: pointWithFavor.favor,
      },
      favor,
    });
  } catch (error) {
    console.error("Error fetching point data:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
