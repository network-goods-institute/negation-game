"use server";

import { db } from "@/services/db";
import { spacesTable } from "@/db/tables/spacesTable";
import { eq } from "drizzle-orm";
import { requireSpaceAdmin } from "@/utils/adminUtils";
import { getUserId } from "@/actions/users/getUserId";

interface UpdateSpaceSettingsArgs {
  spaceId: string;
  allowPublicTopicCreation: boolean;
}

export async function updateSpaceSettings({ spaceId, allowPublicTopicCreation }: UpdateSpaceSettingsArgs) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to update space settings");
  }

  await requireSpaceAdmin(userId, spaceId);

  await db
    .update(spacesTable)
    .set({ 
      allowPublicTopicCreation,
      updatedAt: new Date()
    })
    .where(eq(spacesTable.id, spaceId));

  return { success: true };
}