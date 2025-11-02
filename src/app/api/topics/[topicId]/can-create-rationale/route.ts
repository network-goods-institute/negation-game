import { NextResponse } from "next/server";
import { canUserCreateRationaleForTopic } from "@/actions/topics/manageTopicPermissions";
import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { topicsTable } from "@/db/schema";
import { eq } from "drizzle-orm";import { logger } from "@/lib/logger";

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

    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({
        canCreate: false,
        isRestricted: false,
        topicExists: false,
      });
    }

    // Check if topic exists and get its restriction status
    const topic = await db
      .select({
        restrictedRationaleCreation: topicsTable.restrictedRationaleCreation,
      })
      .from(topicsTable)
      .where(eq(topicsTable.id, topicIdNum))
      .limit(1);

    if (!topic[0]) {
      return NextResponse.json({
        canCreate: false,
        isRestricted: false,
        topicExists: false,
      });
    }

    const canCreate = await canUserCreateRationaleForTopic(userId, topicIdNum);

    return NextResponse.json({
      canCreate,
      isRestricted: topic[0].restrictedRationaleCreation,
      topicExists: true,
    });
  } catch (error) {
    logger.error("Error checking rationale creation permission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
