import { db } from "@/services/db";
import {
  pointClustersTable,
  dailyStancesTable,
  endorsementsTable,
  effectiveRestakesView,
  doubtsTable,
  rationalePointsTable,
} from "@/db/schema";
import { delta as deltaFn, stance } from "@/lib/negation-game/deltaScore";
import { and, eq, inArray, or, sql } from "drizzle-orm";import { logger } from "@/lib/logger";

export interface DeltaResult {
  delta: number | null;
  noInteraction: boolean;
  noEngagementBy?: "A" | "B" | "both";
}

export interface BatchDeltaRequest {
  userAId: string;
  userBId: string;
  rootPointId: number;
  snapDay?: string;
}

export interface BatchDeltaResult extends DeltaResult {
  rootPointId: number;
}

export interface RationaleBatchRequest {
  userAId: string;
  userBId: string;
  rationaleId: string;
  snapDay?: string;
  requestingUserId?: string;
}

export interface RationaleBatchResult {
  rationaleId: string;
  delta: number | null;
  noInteraction: boolean;
  stats?: any;
}

/**
 * Batch compute deltas for multiple root points between the same two users
 */
export async function computeDeltaBatch({
  userAId,
  userBId,
  rootPointIds,
  snapDay = new Date().toISOString().slice(0, 10),
}: {
  userAId: string;
  userBId: string;
  rootPointIds: number[];
  snapDay?: string;
}): Promise<BatchDeltaResult[]> {
  if (rootPointIds.length === 0) {
    return [];
  }

  const allClusters = await db
    .select({
      rootId: pointClustersTable.rootId,
      pointId: pointClustersTable.pointId,
      sign: pointClustersTable.sign,
    })
    .from(pointClustersTable)
    .where(inArray(pointClustersTable.rootId, rootPointIds));

  const clustersByRoot: Record<
    number,
    Array<{ pointId: number; sign: 1 | -1 }>
  > = {};
  const missingRoots: number[] = [];

  for (const rootId of rootPointIds) {
    clustersByRoot[rootId] = [];
  }

  for (const cluster of allClusters) {
    clustersByRoot[cluster.rootId].push({
      pointId: cluster.pointId,
      sign: (cluster.sign as 1 | -1) ?? 1,
    });
  }

  for (const rootId of rootPointIds) {
    if (clustersByRoot[rootId].length === 0) {
      missingRoots.push(rootId);
    }
  }

  if (missingRoots.length > 0) {
    logger.warn(
      `[computeDeltaBatch] ${missingRoots.length} clusters missing. Clusters should be pre-built offline.`
    );
  }

  const allPointIds = new Set<number>();
  const signMaps: Record<number, Record<number, 1 | -1>> = {};

  for (const rootId of rootPointIds) {
    signMaps[rootId] = {};
    for (const cluster of clustersByRoot[rootId]) {
      allPointIds.add(cluster.pointId);
      signMaps[rootId][cluster.pointId] = cluster.sign;
    }
  }

  const allPointIdsArray = Array.from(allPointIds);
  // Single batch query for all stances across all points
  let stancesRows = await db
    .select({
      userId: dailyStancesTable.userId,
      pointId: dailyStancesTable.pointId,
      z: dailyStancesTable.zValue,
    })
    .from(dailyStancesTable)
    .where(
      and(
        eq(dailyStancesTable.snapDay, new Date(snapDay)),
        inArray(dailyStancesTable.userId, [userAId, userBId]),
        inArray(dailyStancesTable.pointId, allPointIdsArray)
      )
    );

  if (stancesRows.length === 0) {
  }

  const results: BatchDeltaResult[] = [];

  if (stancesRows.length > 0) {
    const stanceMapA: Record<number, number> = {};
    const stanceMapB: Record<number, number> = {};

    for (const row of stancesRows) {
      if (row.userId === userAId) stanceMapA[row.pointId] = row.z;
      else if (row.userId === userBId) stanceMapB[row.pointId] = row.z;
    }

    for (const rootId of rootPointIds) {
      const cluster = clustersByRoot[rootId];
      if (cluster.length === 0) {
        results.push({
          rootPointId: rootId,
          delta: null,
          noInteraction: false,
        });
        continue;
      }

      const pointIds = cluster.map((c) => c.pointId);
      const signMap = signMaps[rootId];

      const aVec: number[] = [];
      const bVec: number[] = [];

      for (const pid of pointIds) {
        aVec.push(stanceMapA[pid] ?? 0);
        bVec.push(stanceMapB[pid] ?? 0);
      }

      const aNonZero = aVec.some((v) => v !== 0);
      const bNonZero = bVec.some((v) => v !== 0);
      const delta = deltaFn(aVec, bVec);

      results.push({
        rootPointId: rootId,
        delta,
        noInteraction: delta === null,
        noEngagementBy:
          delta === null && aNonZero !== bNonZero
            ? aNonZero
              ? "B"
              : "A"
            : delta === null && !aNonZero && !bNonZero
              ? "both"
              : undefined,
      });
    }
  } else {
    const [
      endorsementRows,
      restakeRows,
      doubtRows,
      totalCredRows,
      totalRestakeRows,
    ] = await Promise.all([
      db
        .select({
          pointId: endorsementsTable.pointId,
          userId: endorsementsTable.userId,
          cred: endorsementsTable.cred,
        })
        .from(endorsementsTable)
        .where(
          and(
            inArray(endorsementsTable.userId, [userAId, userBId]),
            inArray(endorsementsTable.pointId, allPointIdsArray)
          )
        ),

      db
        .select({
          pointId:
            sql<number>`COALESCE(${effectiveRestakesView.pointId}, ${effectiveRestakesView.negationId})`.mapWith(
              Number
            ),
          userId: effectiveRestakesView.userId,
          amount: effectiveRestakesView.effectiveAmount,
        })
        .from(effectiveRestakesView)
        .where(
          and(
            inArray(effectiveRestakesView.userId, [userAId, userBId]),
            or(
              inArray(effectiveRestakesView.pointId, allPointIdsArray),
              inArray(effectiveRestakesView.negationId, allPointIdsArray)
            ),
            sql`${effectiveRestakesView.effectiveAmount} > 0`
          )
        ),

      db
        .select({
          pointId:
            sql<number>`COALESCE(${doubtsTable.pointId}, ${doubtsTable.negationId})`.mapWith(
              Number
            ),
          userId: doubtsTable.userId,
          amount: doubtsTable.amount,
        })
        .from(doubtsTable)
        .where(
          and(
            inArray(doubtsTable.userId, [userAId, userBId]),
            or(
              inArray(doubtsTable.pointId, allPointIdsArray),
              inArray(doubtsTable.negationId, allPointIdsArray)
            ),
            sql`${doubtsTable.amount} > 0`
          )
        ),

      db
        .select({
          userId: endorsementsTable.userId,
          totalEndorse:
            sql<number>`COALESCE(SUM(${endorsementsTable.cred}), 0)`.mapWith(
              Number
            ),
        })
        .from(endorsementsTable)
        .where(inArray(endorsementsTable.userId, [userAId, userBId]))
        .groupBy(endorsementsTable.userId),

      db
        .select({
          userId: effectiveRestakesView.userId,
          totalRestake:
            sql<number>`COALESCE(SUM(${effectiveRestakesView.effectiveAmount}), 0)`.mapWith(
              Number
            ),
        })
        .from(effectiveRestakesView)
        .where(
          and(
            inArray(effectiveRestakesView.userId, [userAId, userBId]),
            sql`${effectiveRestakesView.effectiveAmount} > 0`
          )
        )
        .groupBy(effectiveRestakesView.userId),
    ]);

    logger.log(
      `[computeDeltaBatch] Fetched ${endorsementRows.length} endorsements, ${restakeRows.length} restakes, ${doubtRows.length} doubts`
    );

    const totalCredMap: Record<string, number> = {};
    for (const row of totalCredRows) {
      totalCredMap[row.userId] = row.totalEndorse;
    }
    for (const row of totalRestakeRows) {
      totalCredMap[row.userId] =
        (totalCredMap[row.userId] || 0) + row.totalRestake;
    }
    if (!totalCredMap[userAId]) totalCredMap[userAId] = 1;
    if (!totalCredMap[userBId]) totalCredMap[userBId] = 1;

    const engagementMapA: Record<
      number,
      { endorse: number; restake: number; doubt: number }
    > = {};
    const engagementMapB: Record<
      number,
      { endorse: number; restake: number; doubt: number }
    > = {};

    for (const pointId of allPointIdsArray) {
      engagementMapA[pointId] = { endorse: 0, restake: 0, doubt: 0 };
      engagementMapB[pointId] = { endorse: 0, restake: 0, doubt: 0 };
    }

    for (const row of endorsementRows) {
      if (row.userId === userAId) {
        engagementMapA[row.pointId].endorse = row.cred;
      } else if (row.userId === userBId) {
        engagementMapB[row.pointId].endorse = row.cred;
      }
    }

    for (const row of restakeRows) {
      if (row.userId === userAId) {
        engagementMapA[row.pointId].restake = row.amount;
      } else if (row.userId === userBId) {
        engagementMapB[row.pointId].restake = row.amount;
      }
    }

    for (const row of doubtRows) {
      if (row.userId === userAId) {
        engagementMapA[row.pointId].doubt = row.amount;
      } else if (row.userId === userBId) {
        engagementMapB[row.pointId].doubt = row.amount;
      }
    }

    for (const rootId of rootPointIds) {
      const cluster = clustersByRoot[rootId];
      if (cluster.length === 0) {
        results.push({
          rootPointId: rootId,
          delta: null,
          noInteraction: false,
        });
        continue;
      }

      const pointIds = cluster.map((c) => c.pointId);
      const signMap = signMaps[rootId];

      const aVec: number[] = [];
      const bVec: number[] = [];

      for (const pid of pointIds) {
        const engA = engagementMapA[pid];
        const engB = engagementMapB[pid];
        const stanceA = stance(
          engA.endorse,
          engA.restake,
          engA.doubt,
          signMap[pid],
          totalCredMap[userAId]
        );
        const stanceB = stance(
          engB.endorse,
          engB.restake,
          engB.doubt,
          signMap[pid],
          totalCredMap[userBId]
        );
        aVec.push(stanceA);
        bVec.push(stanceB);
      }

      const aNonZero = aVec.some((v) => v !== 0);
      const bNonZero = bVec.some((v) => v !== 0);
      const delta = deltaFn(aVec, bVec);

      results.push({
        rootPointId: rootId,
        delta,
        noInteraction: delta === null,
        noEngagementBy:
          delta === null && aNonZero !== bNonZero
            ? aNonZero
              ? "B"
              : "A"
            : delta === null && !aNonZero && !bNonZero
              ? "both"
              : undefined,
      });
    }
  }

  return results;
}

/**
 * Batch compute rationale deltas for multiple rationales between the same two users
 */
export async function computeRationaleDeltaBatch({
  userAId,
  userBId,
  rationaleIds,
  snapDay = new Date().toISOString().slice(0, 10),
  requestingUserId,
}: {
  userAId: string;
  userBId: string;
  rationaleIds: string[];
  snapDay?: string;
  requestingUserId?: string;
}): Promise<RationaleBatchResult[]> {
  if (rationaleIds.length === 0) {
    return [];
  }

  if (
    requestingUserId &&
    requestingUserId !== userAId &&
    requestingUserId !== userBId
  ) {
    return rationaleIds.map((id) => ({
      rationaleId: id,
      delta: null,
      noInteraction: false,
    }));
  }
  const rationalePoints = await db
    .select({
      rationaleId: rationalePointsTable.rationaleId,
      pointId: rationalePointsTable.pointId,
    })
    .from(rationalePointsTable)
    .where(inArray(rationalePointsTable.rationaleId, rationaleIds));

  const pointsByRationale: Record<string, number[]> = {};
  for (const rationaleId of rationaleIds) {
    pointsByRationale[rationaleId] = [];
  }

  for (const mapping of rationalePoints) {
    pointsByRationale[mapping.rationaleId].push(mapping.pointId);
  }

  const allPointIds = [...new Set(rationalePoints.map((rp) => rp.pointId))];

  if (allPointIds.length === 0) {
    return rationaleIds.map((id) => ({
      rationaleId: id,
      delta: null,
      noInteraction: true,
    }));
  }

  const allClusters = await db
    .select({
      rootId: pointClustersTable.rootId,
      pointId: pointClustersTable.pointId,
      sign: pointClustersTable.sign,
    })
    .from(pointClustersTable)
    .where(inArray(pointClustersTable.pointId, allPointIds));

  const clustersByPoint: Record<number, { rootId: number; sign: 1 | -1 }> = {};
  for (const cluster of allClusters) {
    clustersByPoint[cluster.pointId] = {
      rootId: cluster.rootId,
      sign: (cluster.sign as 1 | -1) ?? 1,
    };
  }

  const rootIdsByRationale: Record<string, number[]> = {};
  for (const rationaleId of rationaleIds) {
    const rootIds = new Set<number>();
    for (const pointId of pointsByRationale[rationaleId]) {
      const cluster = clustersByPoint[pointId];
      if (cluster) {
        rootIds.add(cluster.rootId);
      }
    }
    rootIdsByRationale[rationaleId] = Array.from(rootIds);
  }

  const allRootIds = [...new Set(Object.values(rootIdsByRationale).flat())];

  if (allRootIds.length === 0) {
    return rationaleIds.map((id) => ({
      rationaleId: id,
      delta: null,
      noInteraction: true,
    }));
  }

  const batchResults = await computeDeltaBatch({
    userAId,
    userBId,
    rootPointIds: allRootIds,
    snapDay,
  });

  const deltasByRootId: Record<number, number | null> = {};
  for (const result of batchResults) {
    deltasByRootId[result.rootPointId] = result.delta;
  }

  const results: RationaleBatchResult[] = [];

  for (const rationaleId of rationaleIds) {
    const rootIds = rootIdsByRationale[rationaleId];

    if (rootIds.length === 0) {
      results.push({
        rationaleId,
        delta: null,
        noInteraction: true,
      });
      continue;
    }
    const clusterDeltas = rootIds
      .map((rootId) => deltasByRootId[rootId])
      .filter((delta): delta is number => delta !== null);

    if (clusterDeltas.length === 0) {
      results.push({
        rationaleId,
        delta: null,
        noInteraction: true,
      });
      continue;
    }

    const rationaleDelta =
      clusterDeltas.reduce((sum, delta) => sum + delta, 0) /
      clusterDeltas.length;

    results.push({
      rationaleId,
      delta: rationaleDelta,
      noInteraction: false,
      stats: {
        totalClusters: rootIds.length,
        validClusters: clusterDeltas.length,
        pointIds: pointsByRationale[rationaleId],
      },
    });
  }

  return results;
}
