import { NextResponse } from "next/server";
import { fetchUserAssignments } from "@/actions/topics/manageRationaleAssignments";
import { getUserId } from "@/actions/users/getUserId";import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignments = await fetchUserAssignments(userId);
    return NextResponse.json(assignments);
  } catch (error) {
    logger.error("Error fetching user assignments:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
