"use server";

import { db } from "@/services/db";
import { topicsTable, topicPermissionsTable } from "@/db/schema";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { getSpaceTopicCreationPermission } from "@/actions/spaces/getSpaceTopicCreationPermission";

export async function createTopicWithPermissions(data: {
  name: string;
  space: string;
  discourseUrl?: string;
  restrictedRationaleCreation: boolean;
  permissions?: { userId: string; canCreateRationale: boolean }[];
}) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to create topic");
  }

  const allowPublicTopicCreation = await getSpaceTopicCreationPermission(data.space);
  if (!allowPublicTopicCreation) {
    await requireSpaceAdmin(userId, data.space);
  }

  const [topic] = await db
    .insert(topicsTable)
    .values({
      name: data.name,
      space: data.space,
      discourseUrl: data.discourseUrl || "",
      restrictedRationaleCreation: data.restrictedRationaleCreation,
    })
    .returning({
      id: topicsTable.id,
      name: topicsTable.name,
      space: topicsTable.space,
      discourseUrl: topicsTable.discourseUrl,
      restrictedRationaleCreation: topicsTable.restrictedRationaleCreation,
    });

  // Set permissions if topic is restricted and permissions are provided
  if (
    data.restrictedRationaleCreation &&
    data.permissions &&
    data.permissions.length > 0
  ) {
    const permissionValues = data.permissions.map(
      ({ userId, canCreateRationale }) => ({
        topicId: topic.id,
        userId,
        canCreateRationale,
      })
    );

    await db.insert(topicPermissionsTable).values(permissionValues);
  }

  return topic;
}
