"use server";

import { usersTable, viewpointsTable } from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";

export const fetchViewpoint = async (id: string) => {
  console.log("[fetchViewpoint] Starting fetch for id:", id);

  if (id === "DISABLED") {
    console.log("[fetchViewpoint] Returning disabled defaults");
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
    };
  }

  console.log("[fetchViewpoint] Querying database...");
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
    })
    .from(viewpointsTable)
    .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
    .where(eq(viewpointsTable.id, id))
    .limit(1)
    .then((results) => {
      console.log(
        "[fetchViewpoint] Query results:",
        JSON.stringify(results, null, 2)
      );
      return results[0] || null;
    });

  if (!viewpoint) {
    console.log("[fetchViewpoint] No viewpoint found, returning defaults");
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
    };
  }

  console.log("[fetchViewpoint] Returning viewpoint:", {
    id: viewpoint.id,
    title: viewpoint.title,
    author: viewpoint.author,
    createdAt: viewpoint.createdAt,
    space: viewpoint.space,
  });

  return {
    ...viewpoint,
    description: viewpoint.description,
  };
};
