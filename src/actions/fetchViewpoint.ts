"use server";

import {
  usersTable,
  viewpointsTable,
  viewpointInteractionsTable,
  topicsTable,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";
import { trackViewpointView } from "./trackViewpointView";
import { calculateViewpointStats } from "./utils/calculateViewpointStats";

export const fetchViewpoint = async (id: string) => {
  if (id === "DISABLED") {
    // Returning safe defaults for encoded pages which do not use viewpoint data.
    return {
      id: "DISABLED",
      title: "",
      author: "",
      description: "",
      topic: "",
      originalPointIds: [] as number[],
      graph: { nodes: [], edges: [] },
      createdBy: "",
      createdAt: new Date(0),
      space: null,
      statistics: {
        views: 0,
        copies: 0,
        totalCred: 0,
        averageFavor: 0,
      },
      copiedFromId: null,
    };
  }

  // Fetch the viewpoint with user and interaction information
  const viewpoint = await db
    .select({
      ...getColumns(viewpointsTable),
      author: usersTable.username,
      originalPointIds: sql<number[]>`(
        SELECT ARRAY(
          SELECT (data->>'pointId')::int
          FROM jsonb_array_elements(${viewpointsTable.graph}->'nodes') n,
               jsonb_extract_path(n, 'data') as data
          WHERE n->>'type' = 'point'
          ORDER BY (data->>'pointId')::int
        )
      )`,
      views: viewpointInteractionsTable.views,
      copies: viewpointInteractionsTable.copies,
      topic: topicsTable.name,
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .leftJoin(
      viewpointInteractionsTable,
      eq(viewpointInteractionsTable.viewpointId, viewpointsTable.id)
    )
    .leftJoin(topicsTable, eq(viewpointsTable.topicId, topicsTable.id))
    .where(eq(viewpointsTable.id, id))
    .limit(1)
    .then((results) => {
      return results[0] || null;
    });

  if (!viewpoint) {
    // Return null to trigger a 404 in the page component
    return null;
  }

  await trackViewpointView(id);

  const { totalCred, averageFavor } = await calculateViewpointStats({
    graph: viewpoint.graph,
    createdBy: viewpoint.createdBy,
  });

  return {
    ...viewpoint,
    description: viewpoint.description,
    statistics: {
      views: viewpoint.views || 0,
      copies: viewpoint.copies || 0,
      totalCred,
      averageFavor,
    },
  };
};
