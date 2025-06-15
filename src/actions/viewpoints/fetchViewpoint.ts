"use server";

import {
  usersTable,
  viewpointsTable,
  viewpointInteractionsTable,
  topicsTable,
} from "@/db/schema";
import { activeViewpointsFilter } from "@/db/tables/viewpointsTable";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, sql, and } from "drizzle-orm";
import { trackViewpointView } from "./trackViewpointView";
import { calculateViewpointStats } from "@/actions/utils/calculateViewpointStats";

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
    .where(and(eq(viewpointsTable.id, id), activeViewpointsFilter))
    .limit(1)
    .then((results) => {
      return results[0] || null;
    });

  if (!viewpoint) {
    // Return null to trigger a 404 in the page component
    return null;
  }

  await trackViewpointView(id);

  // Server-side hydrate point data for each graph node (skipped during Jest tests)
  if (
    !process.env.JEST_WORKER_ID &&
    viewpoint.graph &&
    Array.isArray(viewpoint.graph.nodes)
  ) {
    // Collect unique pointIds from graph nodes
    const pointIds = Array.from(
      new Set(
        viewpoint.graph.nodes
          .filter(
            (node: any) => node.type === "point" && node.data?.pointId != null
          )
          .map((node: any) => node.data.pointId as number)
      )
    );
    if (pointIds.length > 0) {
      // Dynamically import fetchPoints to avoid test-time errors
      const { fetchPoints } = await import("@/actions/points/fetchPoints");
      const pointsData: any[] = await fetchPoints(pointIds);
      const pdMap = new Map<number, any>(
        pointsData.map((p: any) => [p.pointId, p])
      );
      // Embed initial data into each point node
      const hydratedNodes = viewpoint.graph.nodes.map((node: any) => {
        if (node.type === "point" && node.data?.pointId != null) {
          const initial = pdMap.get(node.data.pointId);
          return {
            ...node,
            data: {
              ...node.data,
              initialPointData: initial ?? null,
            },
          };
        }
        return node;
      });
      viewpoint.graph = { nodes: hydratedNodes, edges: viewpoint.graph.edges };
    }
  }

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
