"use server";

import { db } from "@/services/db";
import { topicsTable } from "@/db/tables/topicsTable";
import { getUserId } from "@/actions/users/getUserId";
import { requireSpaceAdmin } from "@/utils/adminUtils";

export async function createTopic(
  name: string,
  space: string,
  discourseUrl: string = "",
  restrictedRationaleCreation: boolean = false
) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to create topic");
  }

  await requireSpaceAdmin(userId, space);

  const [topic] = await db
    .insert(topicsTable)
    .values({ name, space, discourseUrl, restrictedRationaleCreation })
    .returning({
      id: topicsTable.id,
      name: topicsTable.name,
      discourseUrl: topicsTable.discourseUrl,
      restrictedRationaleCreation: topicsTable.restrictedRationaleCreation,
    });
  return topic;
}
