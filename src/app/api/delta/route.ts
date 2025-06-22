import { computeDelta } from "@/actions/analytics/computeDelta";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userAId, userBId, rootPointId } = await req.json();
    if (!userAId || !userBId || !rootPointId) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }
    const result = await computeDelta({
      userAId,
      userBId,
      rootPointId: Number(rootPointId),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("delta api error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
