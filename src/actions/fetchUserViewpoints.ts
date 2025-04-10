"use server";

import {
  viewpointsTable,
  usersTable,
  viewpointInteractionsTable,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { getUserId } from "@/actions/getUserId";
import { calculateViewpointStats } from "./utils/calculateViewpointStats";

export const fetchUserViewpoints = async (username?: string) => {
  const userId = await getUserId();
  if (!userId) return [];

  // If no username provided, use the current user's ID
  let targetUserId = userId;

  // If username provided, look up the user
  if (username) {
    const user = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (user.length === 0) return null;
    targetUserId = user[0].id;
  }

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
    .where(eq(viewpointsTable.createdBy, targetUserId))
    .orderBy(desc(viewpointsTable.createdAt));

  // Calculate statistics for each viewpoint
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
