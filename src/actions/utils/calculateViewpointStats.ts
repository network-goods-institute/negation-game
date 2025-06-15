import {
  endorsementsTable,
  pointFavorHistoryView,
  pointsTable,
} from "@/db/schema";
import { db } from "@/services/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

interface ViewpointInput {
  graph: any;
  createdBy: string;
}

interface ViewpointStats {
  totalCred: number;
  averageFavor: number;
}

export const calculateViewpointStats = async (
  viewpoint: ViewpointInput
): Promise<ViewpointStats> => {
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
    console.error("Error extracting point IDs from viewpoint graph:", e);
  }

  let totalCred = 0;
  let averageFavor = 0;

  if (pointIds.length > 0) {
    const endorsementsRaw = await db
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
          eq(pointsTable.isActive, true),
          eq(endorsementsTable.userId, viewpoint.createdBy)
        )
      );

    const endorsements = endorsementsRaw.reduce(
      (acc, row) => {
        const existing = acc.find((e) => e.pointId === row.pointId);
        if (existing) {
          existing.cred += row.cred;
        } else {
          acc.push({ pointId: row.pointId, cred: row.cred });
        }
        return acc;
      },
      [] as { pointId: number; cred: number }[]
    );

    totalCred = endorsements.reduce((sum, row) => sum + Number(row.cred), 0);

    const endorsedPointIds = endorsements.map((e) => e.pointId);

    if (endorsedPointIds.length > 0) {
      // Get the favor history for the endorsed points
      const favorValues = await db
        .select({
          pointId: pointFavorHistoryView.pointId,
          favor: pointFavorHistoryView.favor,
          eventTime: pointFavorHistoryView.eventTime,
        })
        .from(pointFavorHistoryView)
        .where(inArray(pointFavorHistoryView.pointId, endorsedPointIds))
        .orderBy(desc(pointFavorHistoryView.eventTime));

      // Get the most recent favor value for each endorsed point
      const latestFavorByPoint = new Map<number, number>();
      favorValues.forEach((row) => {
        if (!latestFavorByPoint.has(row.pointId)) {
          const favorValue = row.favor ?? 0;
          latestFavorByPoint.set(row.pointId, favorValue);
        }
      });

      // Calculate average favor from the latest values of endorsed points only
      const pointsWithFavor = Array.from(latestFavorByPoint.values()).filter(
        (favor) => favor > 0
      );
      const totalFavor = pointsWithFavor.reduce((sum, favor) => sum + favor, 0);

      averageFavor =
        pointsWithFavor.length > 0
          ? Math.round(totalFavor / pointsWithFavor.length)
          : 0;
    }
  }

  return { totalCred, averageFavor };
};
