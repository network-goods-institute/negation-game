"use server";

import { db } from "@/services/db";
import { topicPermissionsTable, topicsTable } from "@/db/schema";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { eq, and } from "drizzle-orm";

export async function setTopicPermission(
  topicId: number,
  userId: string,
  canCreateRationale: boolean
) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to manage topic permissions");
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

  const [permission] = await db
    .insert(topicPermissionsTable)
    .values({ topicId, userId, canCreateRationale })
    .onConflictDoUpdate({
      target: [topicPermissionsTable.topicId, topicPermissionsTable.userId],
      set: { canCreateRationale },
    })
    .returning();

  return permission;
}

export async function removeTopicPermission(topicId: number, userId: string) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to remove topic permissions");
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
    .delete(topicPermissionsTable)
    .where(
      and(
        eq(topicPermissionsTable.topicId, topicId),
        eq(topicPermissionsTable.userId, userId)
      )
    );

  return { success: true };
}

export async function fetchTopicPermissions(topicId: number) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to view topic permissions");
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

  const permissions = await db
    .select({
      userId: topicPermissionsTable.userId,
      canCreateRationale: topicPermissionsTable.canCreateRationale,
    })
    .from(topicPermissionsTable)
    .where(eq(topicPermissionsTable.topicId, topicId));

  return permissions;
}

export async function setTopicPermissions(
  topicId: number,
  permissions: { userId: string; canCreateRationale: boolean }[]
) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    throw new Error("Must be authenticated to manage topic permissions");
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

  // Clear existing permissions for this topic
  await db
    .delete(topicPermissionsTable)
    .where(eq(topicPermissionsTable.topicId, topicId));

  // Set new permissions if any
  if (permissions.length > 0) {
    const permissionValues = permissions.map(
      ({ userId, canCreateRationale }) => ({
        topicId,
        userId,
        canCreateRationale,
      })
    );

    await db.insert(topicPermissionsTable).values(permissionValues);
  }

  return { success: true };
}

export async function canUserCreateRationaleForTopic(
  userId: string,
  topicId: number
): Promise<boolean> {
  const topic = await db
    .select({
      restrictedRationaleCreation: topicsTable.restrictedRationaleCreation,
    })
    .from(topicsTable)
    .where(eq(topicsTable.id, topicId))
    .limit(1);

  if (!topic[0]) {
    return false;
  }

  if (!topic[0].restrictedRationaleCreation) {
    return true;
  }

  const permission = await db
    .select({ canCreateRationale: topicPermissionsTable.canCreateRationale })
    .from(topicPermissionsTable)
    .where(
      and(
        eq(topicPermissionsTable.topicId, topicId),
        eq(topicPermissionsTable.userId, userId)
      )
    )
    .limit(1);

  return permission[0]?.canCreateRationale ?? false;
}
