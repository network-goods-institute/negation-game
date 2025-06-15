"use server";

import { db } from "@/services/db";
import {
  viewpointsTable,
  usersTable,
  viewpointInteractionsTable,
} from "@/db/schema";
import { activeViewpointsFilter } from "@/db/tables/viewpointsTable";
import { eq, desc, and } from "drizzle-orm";
import { getColumns } from "@/db/utils/getColumns";
import { calculateViewpointStats } from "@/actions/utils/calculateViewpointStats";

export async function fetchLatestViewpointByTopic(
  space: string,
  topicId: number
) {
  const viewpoints = await db
    .select({
      ...getColumns(viewpointsTable),
      authorId: usersTable.id,
      authorUsername: usersTable.username,
      views: viewpointInteractionsTable.views,
      copies: viewpointInteractionsTable.copies,
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .leftJoin(
      viewpointInteractionsTable,
      eq(viewpointInteractionsTable.viewpointId, viewpointsTable.id)
    )
    .where(
      and(
        eq(viewpointsTable.space, space),
        eq(viewpointsTable.topicId, topicId),
        activeViewpointsFilter
      )
    )
    .orderBy(desc(viewpointsTable.createdAt))
    .limit(1);

  if (viewpoints.length === 0) {
    return null;
  }

  const viewpoint = viewpoints[0];
  const { totalCred, averageFavor } = await calculateViewpointStats({
    graph: viewpoint.graph,
    createdBy: viewpoint.createdBy,
  });

  return {
    ...viewpoint,
    statistics: {
      views: viewpoint.views || 0,
      copies: viewpoint.copies || 0,
      totalCred,
      averageFavor,
    },
  };
}
