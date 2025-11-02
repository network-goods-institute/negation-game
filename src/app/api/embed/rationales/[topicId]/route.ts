import { NextRequest, NextResponse } from "next/server";
import { fetchViewpointsByTopic } from "@/actions/viewpoints/fetchViewpointsByTopic";import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    // Enforce Scroll space for embeds regardless of query params
    const space = "scroll";
    const resolvedParams = await params;
    const topicId = parseInt(resolvedParams.topicId);
    if (isNaN(topicId)) {
      return NextResponse.json({ error: "Invalid topic ID" }, { status: 400 });
    }

    const viewpoints = await fetchViewpointsByTopic(space, topicId);

    // Transform the data for the embed
    const rationales = viewpoints.map((vp) => ({
      id: vp.id,
      title: vp.title,
      description: vp.description,
      authorUsername: vp.authorUsername,
      createdAt: vp.createdAt,
      space: vp.space,
      statistics: vp.statistics,
      topic: vp.topic,
      topicId: vp.topicId,
    }));

    return NextResponse.json({ rationales });
  } catch (error) {
    logger.error("Failed to fetch rationales for embed:", error);
    return NextResponse.json(
      { error: "Failed to fetch rationales" },
      { status: 500 }
    );
  }
}
