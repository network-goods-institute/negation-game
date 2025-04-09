"use server";

import {
  viewpointsTable,
  usersTable,
  viewpointInteractionsTable,
  pointsTable,
  endorsementsTable,
  pointFavorHistoryView,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { getUserId } from "@/actions/getUserId";

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

        totalCred = endorsements.reduce(
          (sum, row) => sum + Number(row.cred),
          0
        );

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
          const pointsWithFavor = Array.from(
            latestFavorByPoint.values()
          ).filter((favor) => favor > 0);
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
