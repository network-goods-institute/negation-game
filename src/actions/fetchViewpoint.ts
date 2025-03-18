"use server";

import {
  usersTable,
  viewpointsTable,
  viewpointInteractionsTable,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";
import { trackViewpointView } from "./trackViewpointView";

export const fetchViewpoint = async (id: string) => {
  if (id === "DISABLED") {
    // Returning safe defaults for encoded pages which do not use viewpoint data.
    return {
      id: "DISABLED",
      title: "",
      author: "",
      description: "",
      originalPointIds: [] as number[],
      graph: { nodes: [], edges: [] },
      createdBy: "",
      createdAt: new Date(0),
      space: null,
      statistics: {
        views: 0,
        copies: 0,
      },
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
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .leftJoin(
      viewpointInteractionsTable,
      eq(viewpointInteractionsTable.viewpointId, viewpointsTable.id)
    )
    .where(eq(viewpointsTable.id, id))
    .limit(1)
    .then((results) => {
      return results[0] || null;
    });

  if (!viewpoint) {
    // If no viewpoint is found, return safe defaults.
    return {
      id,
      title:
        "This rationale doesn't exist, and I have yet to code a proper error message, please go back to the homepage and pretend you never saw this.",
      author: "",
      description: "",
      originalPointIds: [] as number[],
      graph: { nodes: [], edges: [] },
      createdBy: "",
      createdAt: new Date(0),
      space: null,
      statistics: {
        views: 0,
        copies: 0,
      },
    };
  }

  await trackViewpointView(id);

  return {
    ...viewpoint,
    description: viewpoint.description,
    statistics: {
      views: viewpoint.views || 0,
      copies: viewpoint.copies || 0,
    },
  };
};
