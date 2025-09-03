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
export async function fetchTopicEmbedViewpoints(
  space: string, 
  topicId: number, 
  preferredRationaleId?: string
) {
  let viewpoints;
  
  if (preferredRationaleId) {
    // Fetch the preferred rationale directly plus 2 newest others
    const [preferredViewpointQuery, otherViewpoints] = await Promise.all([
      db
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
            eq(viewpointsTable.id, preferredRationaleId),
            activeViewpointsFilter
          )
        )
        .limit(1),
      db
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
        .limit(3)
    ]);
    
    const preferredViewpoint = preferredViewpointQuery[0];
    if (preferredViewpoint) {
      // Remove preferred from others if it exists there, then combine
      const filteredOthers = otherViewpoints.filter(v => v.id !== preferredRationaleId);
      viewpoints = [preferredViewpoint, ...filteredOthers.slice(0, 2)];
    } else {
      viewpoints = otherViewpoints;
    }
  } else {
    // Just fetch 3 newest rationales
    viewpoints = await db
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
      .limit(3);
  }

  // Calculate stats only for the 3 rationales we'll actually display
  const viewpointsWithStats = await Promise.all(
    viewpoints.map(async (viewpoint: any) => {
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
}