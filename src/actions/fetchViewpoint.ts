"use server";

import {
  usersTable,
  viewpointsTable,
  viewpointInteractionsTable,
  pointsTable,
  endorsementsTable,
  pointFavorHistoryView,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
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
        totalCred: 0,
        averageFavor: 0,
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
    // Return null to trigger a 404 in the page component
    return null;
  }

  const pointIds: number[] = [];
  try {
    if (viewpoint.graph && viewpoint.graph.nodes) {
      viewpoint.graph.nodes.forEach((node: any) => {
        if (node.type === "point" && node.data && node.data.pointId) {
          pointIds.push(node.data.pointId);
        }
      });
    }
  } catch (e) {
    console.error("Error extracting point IDs:", e);
  }

  let totalCred = 0;
  let averageFavor = 0;

  if (pointIds.length > 0) {
    // Get all endorsements by the viewpoint creator
    const endorsements = await db
      .select({
        pointId: pointsTable.id,
        cred: endorsementsTable.cred,
      })
      .from(pointsTable)
      .innerJoin(
        endorsementsTable,
        eq(endorsementsTable.pointId, pointsTable.id)
      )
      .where(
        and(
          inArray(pointsTable.id, pointIds),
          eq(endorsementsTable.userId, viewpoint.createdBy)
        )
      );

    totalCred = endorsements.reduce((sum, row) => sum + Number(row.cred), 0);

    const endorsedPointIds = endorsements.map((e) => e.pointId);

    if (endorsedPointIds.length > 0) {
      const favorValues = await db
        .select({
          pointId: pointFavorHistoryView.pointId,
          favor: pointFavorHistoryView.favor,
          eventTime: pointFavorHistoryView.eventTime,
        })
        .from(pointFavorHistoryView)
        .where(inArray(pointFavorHistoryView.pointId, endorsedPointIds))
        .orderBy(desc(pointFavorHistoryView.eventTime));

      // Get most recent favor value for each endorsed point
      const latestFavorByPoint = new Map();
      favorValues.forEach((row) => {
        if (!latestFavorByPoint.has(row.pointId)) {
          latestFavorByPoint.set(row.pointId, row.favor);
        }
      });

      // Calculate average favor from latest values of endorsed points only
      const pointsWithFavor = Array.from(latestFavorByPoint.values()).filter(
        (favor) => favor > 0
      );
      const totalFavor = pointsWithFavor.reduce(
        (sum, favor) => sum + Number(favor),
        0
      );
      averageFavor =
        pointsWithFavor.length > 0
          ? Math.round(totalFavor / pointsWithFavor.length)
          : 0;
    }
  }

  await trackViewpointView(id);

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
