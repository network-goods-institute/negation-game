import { db } from "@/services/db";
import { pointsWithDetailsView, usersTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { addFavor } from "@/db/utils/addFavor";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pointId = Number(url.searchParams.get("pointId"));
  const space = url.searchParams.get("space");

  if (!pointId || !space) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  const point = await db
    .select({
      pointId: pointsWithDetailsView.pointId,
      content: pointsWithDetailsView.content,
      cred: sql<number>`"point_with_details_view"."cred"`.mapWith(Number),
      amountSupporters: pointsWithDetailsView.amountSupporters,
      amountNegations: pointsWithDetailsView.amountNegations,
      author: usersTable.username,
    })
    .from(pointsWithDetailsView)
    .innerJoin(usersTable, eq(usersTable.id, pointsWithDetailsView.createdBy))
    .where(
      and(
        eq(pointsWithDetailsView.pointId, pointId),
        eq(pointsWithDetailsView.space, space)
      )
    )
    .limit(1)
    .then((results) => results[0]);

  if (!point) {
    return NextResponse.json({ error: "Point not found" }, { status: 404 });
  }

  const [pointWithFavor] = await addFavor([{ id: point.pointId }]);

  return NextResponse.json({
    ...point,
    favor: pointWithFavor.favor,
  });
}
