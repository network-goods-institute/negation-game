"use server";

import { db } from "@/services/db";
import { spacesTable } from "@/db/tables/spacesTable";
import { eq } from "drizzle-orm";

export async function getSpaceTopicCreationPermission(spaceId: string): Promise<boolean> {
  const space = await db
    .select({ allowPublicTopicCreation: spacesTable.allowPublicTopicCreation })
    .from(spacesTable)
    .where(eq(spacesTable.id, spaceId))
    .limit(1);

  return space[0]?.allowPublicTopicCreation ?? false;
}