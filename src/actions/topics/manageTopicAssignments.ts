"use server";

import { db } from "@/services/db";
import { topicAssignmentsTable, topicsTable } from "@/db/schema";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { eq, and } from "drizzle-orm";

export async function assignUserToTopic(
  topicId: number,
  userId: string,
  required: boolean = false
) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to assign users to topics");
  }

  const topic = await db
    .select({ space: topicsTable.space })
    .from(topicsTable)
    .where(eq(topicsTable.id, topicId))
    .limit(1);

  if (!topic[0]) {
    throw new Error("Topic not found");
  }

  await requireSpaceAdmin(currentUserId, topic[0].space);

  const [assignment] = await db
    .insert(topicAssignmentsTable)
    .values({ topicId, userId, required })
    .onConflictDoUpdate({
      target: [topicAssignmentsTable.topicId, topicAssignmentsTable.userId],
      set: { required },
    })
    .returning();

  return assignment;
}

export async function removeUserFromTopic(topicId: number, userId: string) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to remove users from topics");
  }

  const topic = await db
    .select({ space: topicsTable.space })
    .from(topicsTable)
    .where(eq(topicsTable.id, topicId))
    .limit(1);

  if (!topic[0]) {
    throw new Error("Topic not found");
  }

  await requireSpaceAdmin(currentUserId, topic[0].space);

  await db
    .delete(topicAssignmentsTable)
    .where(
      and(
        eq(topicAssignmentsTable.topicId, topicId),
        eq(topicAssignmentsTable.userId, userId)
      )
    );

  return { success: true };
}