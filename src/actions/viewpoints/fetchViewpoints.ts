"use server";

import {
  viewpointsTable,
  usersTable,
  viewpointInteractionsTable,
  topicsTable,
} from "@/db/schema";
import { activeViewpointsFilter } from "@/db/tables/viewpointsTable";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, desc, and } from "drizzle-orm";
import { calculateViewpointStats } from "@/actions/utils/calculateViewpointStats";

export const fetchViewpoints = async (space: string) => {
  // First fetch the viewpoints basic info
  const viewpoints = await db
    .select({
      ...getColumns(viewpointsTable),
      authorId: usersTable.id,
      authorUsername: usersTable.username,
      views: viewpointInteractionsTable.views,
      copies: viewpointInteractionsTable.copies,
      topic: topicsTable.name,
      topicId: topicsTable.id,
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .leftJoin(
      viewpointInteractionsTable,
      eq(viewpointInteractionsTable.viewpointId, viewpointsTable.id)
    )
    .leftJoin(topicsTable, eq(viewpointsTable.topicId, topicsTable.id))
    .where(and(eq(viewpointsTable.space, space), activeViewpointsFilter))
    .orderBy(desc(viewpointsTable.createdAt));

  const viewpointsWithStats = await Promise.all(
    viewpoints.map(async (viewpoint) => {
      // Calculate stats using the utility
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
    })
  );

  return viewpointsWithStats;
};
