import { NextResponse } from "next/server";
import { fetchAllTopics } from "@/actions/topics/fetchTopics";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { spaceId } = await params;
    await requireSpaceAdmin(userId, spaceId);

    const topics = await fetchAllTopics(spaceId);
    return NextResponse.json(topics);
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}