import { NextResponse } from "next/server";
import { fetchTopicPermissions } from "@/actions/topics/manageTopicPermissions";import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const { topicId } = await params;
    const topicIdNum = parseInt(topicId);

    if (isNaN(topicIdNum)) {
      return NextResponse.json({ error: "Invalid topic ID" }, { status: 400 });
    }

    const permissions = await fetchTopicPermissions(topicIdNum);
    return NextResponse.json(permissions);
  } catch (error) {
    logger.error("Error fetching topic permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
