"use server";

import {
  viewpointsTable,
  usersTable,
  viewpointInteractionsTable,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { calculateViewpointStats } from "./utils/calculateViewpointStats";

export const fetchViewpoints = async (space: string) => {
  // First fetch the viewpoints basic info
  const viewpoints = await db
    .select({
      ...getColumns(viewpointsTable),
      author: usersTable.username,
      views: viewpointInteractionsTable.views,
      copies: viewpointInteractionsTable.copies,
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .leftJoin(
      viewpointInteractionsTable,
      eq(viewpointInteractionsTable.viewpointId, viewpointsTable.id)
    )
    .where(eq(viewpointsTable.space, space))
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
