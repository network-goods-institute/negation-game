import { NextResponse } from "next/server";
import { updateTopicWithPermissions } from "@/actions/topics/updateTopicWithPermissions";
import { deleteTopic } from "@/actions/topics/deleteTopic";
import { getUserId } from "@/actions/users/getUserId";import { logger } from "@/lib/logger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;
    const data = await request.json();

    const topicIdNumber = parseInt(topicId);
    if (isNaN(topicIdNumber)) {
      return NextResponse.json({ error: "Invalid topic ID" }, { status: 400 });
    }

    // Validate input data
    if (data.name !== undefined && typeof data.name !== "string") {
      return NextResponse.json(
        { error: "Name must be a string" },
        { status: 400 }
      );
    }
    if (
      data.discourseUrl !== undefined &&
      typeof data.discourseUrl !== "string"
    ) {
      return NextResponse.json(
        { error: "Discourse URL must be a string" },
        { status: 400 }
      );
    }
    if (
      data.restrictedRationaleCreation !== undefined &&
      typeof data.restrictedRationaleCreation !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Restricted rationale creation must be a boolean" },
        { status: 400 }
      );
    }
    if (data.permissions !== undefined && !Array.isArray(data.permissions)) {
      return NextResponse.json(
        { error: "Permissions must be an array" },
        { status: 400 }
      );
    }
    if (data.name && data.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    const updatedTopic = await updateTopicWithPermissions(topicIdNumber, data);
    return NextResponse.json(updatedTopic);
  } catch (error) {
    logger.error("Error updating topic:", error);
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
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;

    const topicIdNumber = parseInt(topicId);
    if (isNaN(topicIdNumber)) {
      return NextResponse.json({ error: "Invalid topic ID" }, { status: 400 });
    }

    const result = await deleteTopic(topicIdNumber);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error deleting topic:", error);
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
