"use server";

import { getUserId } from "@/actions/getUserId";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";

export interface UpdateViewpointDetailsArgs {
  id: string;
  title: string;
  description: string;
}

export const updateViewpointDetails = async ({
  id,
  title,
  description,
}: UpdateViewpointDetailsArgs) => {
  const userId = await getUserId();
  if (!userId) {
    throw new Error("Must be authenticated to update rationale");
  }

  const result = await db
    .select()
    .from(viewpointsTable)
    .where(eq(viewpointsTable.id, id))
    .limit(1)
    .then();

  const viewpoint = Array.isArray(result) ? result[0] : result;

  if (!viewpoint || viewpoint.createdBy !== userId) {
    throw new Error("Only the owner can update this rationale");
  }

  try {
    await db
      .update(viewpointsTable)
      .set({
        title,
        description,
      })
      .where(eq(viewpointsTable.id, id));
    return id;
  } catch (error) {
    throw error;
  }
};
