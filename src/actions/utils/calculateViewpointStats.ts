import {
  endorsementsTable,
  pointsTable,
  currentPointFavorView,
  pointsWithDetailsView,
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
      // Get current favor for the endorsed points (much faster than history)
      const favorValues = await db
        .select({
          pointId: currentPointFavorView.pointId,
          favor: currentPointFavorView.favor,
        })
        .from(currentPointFavorView)
        .where(inArray(currentPointFavorView.pointId, endorsedPointIds));

      // Create favor map from current values
      const latestFavorByPoint = new Map<number, number>();
      favorValues.forEach((row) => {
        const favorValue = row.favor ?? 0;
        latestFavorByPoint.set(row.pointId, favorValue);
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

export async function calculateViewpointStatsForEndorsedPoints(
  endorsedPointIds: number[]
) {
  if (endorsedPointIds.length === 0) {
    return {
      totalPoints: 0,
      totalCred: 0,
      totalSupporters: 0,
      averageFavor: 0,
      totalFavor: 0,
    };
  }

  const pointStats = await db
    .select({
      pointId: pointsWithDetailsView.pointId,
      cred: pointsWithDetailsView.cred,
      amountSupporters: pointsWithDetailsView.amountSupporters,
    })
    .from(pointsWithDetailsView)
    .where(inArray(pointsWithDetailsView.pointId, endorsedPointIds));

  const totalPoints = pointStats.length;
  const totalCred = pointStats.reduce((sum, point) => sum + point.cred, 0);
  const totalSupporters = pointStats.reduce(
    (sum, point) => sum + point.amountSupporters,
    0
  );

  const favorStats = await db
    .select({
      pointId: currentPointFavorView.pointId,
      favor: currentPointFavorView.favor,
    })
    .from(currentPointFavorView)
    .where(inArray(currentPointFavorView.pointId, endorsedPointIds));

  const favorMap = new Map(
    favorStats.map((stat) => [stat.pointId, stat.favor])
  );
  const totalFavor = endorsedPointIds.reduce((sum, pointId) => {
    return sum + (favorMap.get(pointId) ?? 0);
  }, 0);

  const averageFavor = totalPoints > 0 ? totalFavor / totalPoints : 0;

  return {
    totalPoints,
    totalCred,
    totalSupporters,
    averageFavor,
    totalFavor,
  };
}
