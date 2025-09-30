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
import { calculateViewpointStatsForViewpoints } from "@/actions/utils/calculateViewpointStats";

type TopicEmbedViewpoint = typeof viewpointsTable.$inferSelect & {
  authorId: string;
  authorUsername: string;
  views: number | null;
  copies: number | null;
};
export async function fetchTopicEmbedViewpoints(
  space: string,
  topicId: number,
  preferredRationaleId?: string
) {
  let viewpoints: TopicEmbedViewpoint[] = [];

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
        .limit(3),
    ]);

    const preferredViewpoint = preferredViewpointQuery[0] as
      | TopicEmbedViewpoint
      | undefined;
    if (preferredViewpoint) {
      // Remove preferred from others if it exists there, then combine
      const filteredOthers = (otherViewpoints as TopicEmbedViewpoint[]).filter(
        (viewpoint) => viewpoint.id !== preferredRationaleId
      );
      viewpoints = [preferredViewpoint, ...filteredOthers.slice(0, 2)];
    } else {
      viewpoints = otherViewpoints as TopicEmbedViewpoint[];
    }
  } else {
    // Just fetch 3 newest rationales
    viewpoints = (await db
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
      .limit(3)) as TopicEmbedViewpoint[];
  }

  const statsByViewpointId = await calculateViewpointStatsForViewpoints(
    viewpoints.map((viewpoint) => ({
      id: viewpoint.id,
      graph: viewpoint.graph,
      createdBy: viewpoint.createdBy,
    }))
  );

  return viewpoints.map((viewpoint) => {
    const stats = statsByViewpointId.get(viewpoint.id) ?? {
      totalCred: 0,
      averageFavor: 0,
    };

    return {
      ...viewpoint,
      statistics: {
        views: viewpoint.views ?? 0,
        copies: viewpoint.copies ?? 0,
        totalCred: stats.totalCred,
        averageFavor: stats.averageFavor,
      },
    };
  });
}
