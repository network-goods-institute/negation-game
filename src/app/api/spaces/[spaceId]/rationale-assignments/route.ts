import { NextResponse } from "next/server";
import { 
  fetchTopicAssignments, 
  assignRationaleToUser, 
  removeRationaleAssignment 
} from "@/actions/topics/manageRationaleAssignments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;
    const assignments = await fetchTopicAssignments(spaceId);
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;
    const { topicId, targetUserId, promptMessage } = await request.json();

    if (!topicId || !targetUserId) {
      return NextResponse.json(
        { error: "Topic ID and target user ID are required" },
        { status: 400 }
      );
    }

    if (typeof topicId !== "number" || typeof targetUserId !== "string") {
      return NextResponse.json(
        { error: "Invalid parameter types" },
        { status: 400 }
      );
    }

    const assignment = await assignRationaleToUser(
      topicId,
      targetUserId,
      promptMessage
    );

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");
    const userId = searchParams.get("userId");

    if (!topicId || !userId) {
      return NextResponse.json(
        { error: "Topic ID and user ID are required" },
        { status: 400 }
      );
    }

    const topicIdNumber = parseInt(topicId);
    if (isNaN(topicIdNumber)) {
      return NextResponse.json(
        { error: "Invalid topic ID" },
        { status: 400 }
      );
    }

    await removeRationaleAssignment(topicIdNumber, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing assignment:", error);
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