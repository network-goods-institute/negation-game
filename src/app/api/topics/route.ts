import { NextResponse } from "next/server";
import { createTopicWithPermissions } from "@/actions/topics/createTopicWithPermissions";
import { getUserId } from "@/actions/users/getUserId";import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      space,
      discourseUrl,
      restrictedRationaleCreation,
      permissions,
    } = await request.json();

    // Validate required fields
    if (!name || !space) {
      return NextResponse.json(
        { error: "Topic name and space are required" },
        { status: 400 }
      );
    }

    // Validate data types
    if (typeof name !== "string" || typeof space !== "string") {
      return NextResponse.json(
        { error: "Name and space must be strings" },
        { status: 400 }
      );
    }

    if (discourseUrl !== undefined && typeof discourseUrl !== "string") {
      return NextResponse.json(
        { error: "Discourse URL must be a string" },
        { status: 400 }
      );
    }

    if (
      restrictedRationaleCreation !== undefined &&
      typeof restrictedRationaleCreation !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Restricted rationale creation must be a boolean" },
        { status: 400 }
      );
    }

    if (permissions !== undefined && !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Permissions must be an array" },
        { status: 400 }
      );
    }

    // Validate content
    if (name.trim().length === 0) {
      return NextResponse.json(
        { error: "Topic name cannot be empty" },
        { status: 400 }
      );
    }

    if (space.trim().length === 0) {
      return NextResponse.json(
        { error: "Space cannot be empty" },
        { status: 400 }
      );
    }

    const topic = await createTopicWithPermissions({
      name,
      space,
      discourseUrl: discourseUrl || "",
      restrictedRationaleCreation: restrictedRationaleCreation || false,
      permissions,
    });

    return NextResponse.json(topic);
  } catch (error) {
    logger.error("Error creating topic:", error);
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
