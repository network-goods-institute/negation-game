"use server";

import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { eq } from "drizzle-orm";

export async function deleteTopic(topicId: number) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to delete topic");
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

  await db.delete(topicsTable).where(eq(topicsTable.id, topicId));

  return { success: true };
}