"use server";

import {
  viewpointsTable,
  usersTable,
  viewpointInteractionsTable,
  topicsTable,
  endorsementsTable,
  pointsTable,
  currentPointFavorView,
} from "@/db/schema";
import { activeViewpointsFilter } from "@/db/tables/viewpointsTable";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export const fetchViewpoints = async (space: string) => {
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

  if (viewpoints.length === 0) {
    return [];
  }

  // Extract all point IDs from all viewpoints in one pass
  const allPointIds = new Set<number>();
  const viewpointPointMaps = new Map<string, number[]>();

  viewpoints.forEach((viewpoint) => {
    const pointIds: number[] = [];
    try {
      if (viewpoint.graph?.nodes) {
        viewpoint.graph.nodes.forEach((node: any) => {
          if (node.type === "point" && node.data?.pointId) {
            const pointId = Number(node.data.pointId);
            pointIds.push(pointId);
            allPointIds.add(pointId);
          }
        });
      }
    } catch (e) {
      console.error("Error extracting point IDs from viewpoint graph:", e);
    }
    viewpointPointMaps.set(viewpoint.id, pointIds);
  });

  const allEndorsements =
    allPointIds.size > 0
      ? await db
          .select({
            pointId: pointsTable.id,
            cred: endorsementsTable.cred,
            userId: endorsementsTable.userId,
          })
          .from(pointsTable)
          .innerJoin(
            endorsementsTable,
            eq(endorsementsTable.pointId, pointsTable.id)
          )
          .where(
            and(
              inArray(pointsTable.id, Array.from(allPointIds)),
              eq(pointsTable.isActive, true),
              inArray(
                endorsementsTable.userId,
                viewpoints.map((v) => v.createdBy)
              )
            )
          )
      : [];

  const allFavorValues =
    allPointIds.size > 0
      ? await db
          .select({
            pointId: currentPointFavorView.pointId,
            favor: currentPointFavorView.favor,
          })
          .from(currentPointFavorView)
          .where(
            inArray(currentPointFavorView.pointId, Array.from(allPointIds))
          )
      : [];

  const endorsementsByUserAndPoint = new Map<string, Map<number, number>>();
  allEndorsements.forEach((endorsement) => {
    const userKey = endorsement.userId;
    if (!endorsementsByUserAndPoint.has(userKey)) {
      endorsementsByUserAndPoint.set(userKey, new Map());
    }
    const userEndorsements = endorsementsByUserAndPoint.get(userKey)!;
    const existing = userEndorsements.get(endorsement.pointId) || 0;
    userEndorsements.set(endorsement.pointId, existing + endorsement.cred);
  });

  const favorByPointId = new Map<number, number>();
  allFavorValues.forEach((row) => {
    favorByPointId.set(row.pointId, row.favor ?? 0);
  });

  const viewpointsWithStats = viewpoints.map((viewpoint) => {
    const pointIds = viewpointPointMaps.get(viewpoint.id) || [];
    const userEndorsements =
      endorsementsByUserAndPoint.get(viewpoint.createdBy) || new Map();

    let totalCred = 0;
    const endorsedPointIds: number[] = [];

    pointIds.forEach((pointId) => {
      const cred = userEndorsements.get(pointId) || 0;
      if (cred > 0) {
        totalCred += cred;
        endorsedPointIds.push(pointId);
      }
    });

    let averageFavor = 0;
    if (endorsedPointIds.length > 0) {
      const favorValues = endorsedPointIds
        .map((pointId) => favorByPointId.get(pointId) || 0)
        .filter((favor) => favor > 0);

      if (favorValues.length > 0) {
        const totalFavor = favorValues.reduce((sum, favor) => sum + favor, 0);
        averageFavor = Math.round(totalFavor / favorValues.length);
      }
    }

    return {
      ...viewpoint,
      statistics: {
        views: viewpoint.views || 0,
        copies: viewpoint.copies || 0,
        totalCred,
        averageFavor,
      },
    };
  });

  return viewpointsWithStats;
};
