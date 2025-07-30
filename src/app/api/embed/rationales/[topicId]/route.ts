import { NextRequest, NextResponse } from "next/server";
import { fetchViewpointsByTopic } from "@/actions/viewpoints/fetchViewpointsByTopic";

export async function GET(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const space = searchParams.get("space");
    
    if (!space) {
      return NextResponse.json(
        { error: "Space parameter is required" },
        { status: 400 }
      );
    }

    const topicId = parseInt(params.topicId);
    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: "Invalid topic ID" },
        { status: 400 }
      );
    }

    const viewpoints = await fetchViewpointsByTopic(space, topicId);
    
    // Transform the data for the embed
    const rationales = viewpoints.map(vp => ({
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
    console.error("Failed to fetch rationales for embed:", error);
    return NextResponse.json(
      { error: "Failed to fetch rationales" },
      { status: 500 }
    );
  }
}