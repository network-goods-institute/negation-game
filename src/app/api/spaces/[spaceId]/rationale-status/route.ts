import { NextResponse } from "next/server";
import { fetchTopicRationaleStatus } from "@/actions/topics/fetchTopicRationaleStatus";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");
    
    const status = await fetchTopicRationaleStatus(
      spaceId,
      topicId ? parseInt(topicId) : undefined
    );

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching rationale status:", error);
    const status =
      error instanceof Error && error.message.includes("admin access required")
        ? 403
        : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status }
    );
  }
}