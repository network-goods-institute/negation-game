import {
  endorsementsTable,
  pointsTable,
  currentPointFavorView,
  pointsWithDetailsView,
} from "@/db/schema";
import { db } from "@/services/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

interface ViewpointInput {
  graph: unknown;
  createdBy: string;
}

interface ViewpointStats {
  totalCred: number;
  averageFavor: number;
}

interface ViewpointStatsBatchInput {
  id: string;
  graph: unknown;
  createdBy: string;
}

const extractPointIdsFromGraph = (graph: unknown): number[] => {
  const pointIds: number[] = [];

  if (!graph || typeof graph !== "object") {
    return pointIds;
  }

  try {
    const nodes =
      (
        graph as {
          nodes?: Array<{ type?: string; data?: { pointId?: number } }>;
        }
      ).nodes ?? [];

    nodes.forEach((node) => {
      if (node?.type === "point") {
        const pointId = node?.data?.pointId;
        if (typeof pointId === "number") {
          pointIds.push(pointId);
        }
      }
    });
  } catch (error) {
    console.error("Error extracting point IDs from viewpoint graph:", error);
  }

  return pointIds;
};

export const calculateViewpointStats = async (
  viewpoint: ViewpointInput
): Promise<ViewpointStats> => {
  const pointIds = extractPointIdsFromGraph(viewpoint.graph);

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
        const existing = acc.find(
          (endorsement) => endorsement.pointId === row.pointId
        );
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

    const endorsedPointIds = endorsements.map(
      (endorsement) => endorsement.pointId
    );

    if (endorsedPointIds.length > 0) {
      const favorValues = await db
        .select({
          pointId: currentPointFavorView.pointId,
          favor: currentPointFavorView.favor,
        })
        .from(currentPointFavorView)
        .where(inArray(currentPointFavorView.pointId, endorsedPointIds));

      const latestFavorByPoint = new Map<number, number>();
      favorValues.forEach((row) => {
        const favorValue = row.favor ?? 0;
        latestFavorByPoint.set(row.pointId, favorValue);
      });

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

export async function calculateViewpointStatsForViewpoints(
  viewpoints: ViewpointStatsBatchInput[]
): Promise<Map<string, ViewpointStats>> {
  const statsByViewpointId = new Map<string, ViewpointStats>();

  if (viewpoints.length === 0) {
    return statsByViewpointId;
  }

  const viewpointDescriptors = viewpoints.map((viewpoint) => ({
    id: viewpoint.id,
    createdBy: viewpoint.createdBy,
    pointIds: Array.from(new Set(extractPointIdsFromGraph(viewpoint.graph))),
  }));

  const allPointIds = new Set<number>();
  const allCreators = new Set<string>();

  viewpointDescriptors.forEach(({ pointIds, createdBy }) => {
    pointIds.forEach((pointId) => allPointIds.add(pointId));
    allCreators.add(createdBy);
  });

  if (allPointIds.size === 0 || allCreators.size === 0) {
    viewpointDescriptors.forEach(({ id }) => {
      statsByViewpointId.set(id, { totalCred: 0, averageFavor: 0 });
    });

    return statsByViewpointId;
  }

  const endorsementRows = await db
    .select({
      pointId: pointsTable.id,
      userId: endorsementsTable.userId,
      cred: endorsementsTable.cred,
    })
    .from(endorsementsTable)
    .innerJoin(pointsTable, eq(pointsTable.id, endorsementsTable.pointId))
    .where(
      and(
        inArray(endorsementsTable.pointId, Array.from(allPointIds)),
        inArray(endorsementsTable.userId, Array.from(allCreators)),
        eq(pointsTable.isActive, true)
      )
    );

  const endorsementTotals = new Map<string, Map<number, number>>();

  endorsementRows.forEach(({ pointId, userId, cred }) => {
    const userTotals =
      endorsementTotals.get(userId) ?? new Map<number, number>();
    const currentCred = userTotals.get(pointId) ?? 0;
    userTotals.set(pointId, currentCred + Number(cred));
    endorsementTotals.set(userId, userTotals);
  });

  const endorsedPointIdsByViewpoint = new Map<string, number[]>();

  viewpointDescriptors.forEach(({ id, createdBy, pointIds }) => {
    const userTotals = endorsementTotals.get(createdBy);
    const endorsedPointIds = pointIds.filter((pointId) =>
      userTotals?.has(pointId)
    );
    endorsedPointIdsByViewpoint.set(id, endorsedPointIds);
  });

  const allEndorsedPointIds = new Set<number>();

  endorsedPointIdsByViewpoint.forEach((pointIds) => {
    pointIds.forEach((pointId) => allEndorsedPointIds.add(pointId));
  });

  const favorByPointId = new Map<number, number>();

  if (allEndorsedPointIds.size > 0) {
    const favorRows = await db
      .select({
        pointId: currentPointFavorView.pointId,
        favor: currentPointFavorView.favor,
      })
      .from(currentPointFavorView)
      .where(
        inArray(currentPointFavorView.pointId, Array.from(allEndorsedPointIds))
      );

    favorRows.forEach(({ pointId, favor }) => {
      favorByPointId.set(pointId, Number(favor ?? 0));
    });
  }

  viewpointDescriptors.forEach(({ id, createdBy }) => {
    const userTotals = endorsementTotals.get(createdBy);
    const endorsedPointIds = endorsedPointIdsByViewpoint.get(id) ?? [];

    const totalCred = endorsedPointIds.reduce((sum, pointId) => {
      const cred = userTotals?.get(pointId) ?? 0;
      return sum + cred;
    }, 0);

    const favorValues = endorsedPointIds
      .map((pointId) => favorByPointId.get(pointId) ?? 0)
      .filter((favor) => favor > 0);

    const totalFavor = favorValues.reduce((sum, favor) => sum + favor, 0);
    const averageFavor =
      favorValues.length > 0 ? Math.round(totalFavor / favorValues.length) : 0;

    statsByViewpointId.set(id, {
      totalCred,
      averageFavor,
    });
  });

  return statsByViewpointId;
}

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
