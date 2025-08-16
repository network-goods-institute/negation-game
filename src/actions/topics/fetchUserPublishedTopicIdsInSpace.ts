"use server";

import { db } from "@/services/db";
import {
  viewpointsTable,
  activeViewpointsFilter,
} from "@/db/tables/viewpointsTable";
import { topicsTable } from "@/db/tables/topicsTable";
import { eq, and, isNotNull } from "drizzle-orm";

export async function fetchUserPublishedTopicIdsInSpace(
  userId: string,
  space: string
) {
  if (!userId) return [] as number[];

  const rows = await db
    .selectDistinct({ topicId: viewpointsTable.topicId })
    .from(viewpointsTable)
    .leftJoin(topicsTable, eq(topicsTable.id, viewpointsTable.topicId))
    .where(
      and(
        eq(viewpointsTable.createdBy, userId),
        isNotNull(viewpointsTable.topicId),
        eq(topicsTable.space, space),
        activeViewpointsFilter
      )
    );

  return rows
    .map((r) => r.topicId!)
    .filter((id): id is number => typeof id === "number");
}
