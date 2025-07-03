"use server";

import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { eq } from "drizzle-orm";

export async function updateTopic(
  topicId: number,
  data: {
    name?: string;
    discourseUrl?: string;
    restrictedRationaleCreation?: boolean;
  }
) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to update topic");
  }

  const existingTopic = await db
    .select({ space: topicsTable.space })
    .from(topicsTable)
    .where(eq(topicsTable.id, topicId))
    .limit(1);

  if (!existingTopic[0]) {
    throw new Error("Topic not found");
  }

  await requireSpaceAdmin(userId, existingTopic[0].space);

  const [updatedTopic] = await db
    .update(topicsTable)
    .set(data)
    .where(eq(topicsTable.id, topicId))
    .returning({
      id: topicsTable.id,
      name: topicsTable.name,
      space: topicsTable.space,
      discourseUrl: topicsTable.discourseUrl,
      restrictedRationaleCreation: topicsTable.restrictedRationaleCreation,
    });

  return updatedTopic;
}