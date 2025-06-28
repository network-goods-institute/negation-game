"use server";

import { db } from "@/services/db";
import { viewpointsTable, activeViewpointsFilter } from "@/db/tables/viewpointsTable";
import { eq, and, inArray, isNotNull } from "drizzle-orm";

export async function fetchUserTopicRationales(userId: string, topicIds: number[]) {
  if (!userId || topicIds.length === 0) return [];
  
  const results = await db
    .selectDistinct({
      topicId: viewpointsTable.topicId,
    })
    .from(viewpointsTable)
    .where(
      and(
        eq(viewpointsTable.createdBy, userId),
        inArray(viewpointsTable.topicId, topicIds),
        activeViewpointsFilter,
        isNotNull(viewpointsTable.topicId)
      )
    );

  return results.map(r => r.topicId);
}