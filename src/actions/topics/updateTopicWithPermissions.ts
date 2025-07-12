"use server";

import { db } from "@/services/db";
import { topicsTable, topicPermissionsTable } from "@/db/schema";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { eq } from "drizzle-orm";

export async function updateTopicWithPermissions(
  topicId: number,
  data: {
    name?: string;
    discourseUrl?: string;
    restrictedRationaleCreation?: boolean;
    closed?: boolean;
    permissions?: { userId: string; canCreateRationale: boolean }[];
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

  // Update the topic
  const [updatedTopic] = await db
    .update(topicsTable)
    .set({
      name: data.name,
      discourseUrl: data.discourseUrl,
      restrictedRationaleCreation: data.restrictedRationaleCreation,
      closed: data.closed,
    })
    .where(eq(topicsTable.id, topicId))
    .returning({
      id: topicsTable.id,
      name: topicsTable.name,
      space: topicsTable.space,
      discourseUrl: topicsTable.discourseUrl,
      restrictedRationaleCreation: topicsTable.restrictedRationaleCreation,
      closed: topicsTable.closed,
    });

  // Clear existing permissions
  await db
    .delete(topicPermissionsTable)
    .where(eq(topicPermissionsTable.topicId, topicId));

  // Set new permissions if topic is restricted and permissions are provided
  if (
    data.restrictedRationaleCreation &&
    data.permissions &&
    data.permissions.length > 0
  ) {
    const permissionValues = data.permissions.map(
      ({ userId, canCreateRationale }) => ({
        topicId,
        userId,
        canCreateRationale,
      })
    );

    await db.insert(topicPermissionsTable).values(permissionValues);
  }

  return updatedTopic;
}
