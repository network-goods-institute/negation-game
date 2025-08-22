"use server";

import { db } from "@/services/db";
import {
  snapshotsTable,
  usersTable,
  pointClustersTable,
  endorsementsTable,
  rationalePointsTable,
  viewpointsTable,
  pointsTable,
} from "@/db/schema";
import { eq, and, sql, inArray, ne } from "drizzle-orm";
import { computeDelta } from "@/actions/analytics/computeDelta";
import { computeDeltaBatch } from "@/actions/analytics/computeDeltaBatch";
import { computeRationaleDelta } from "@/actions/analytics/deltaAggregation";

export interface DeltaComparisonResult {
  mostSimilar: UserDelta[];
  mostDifferent: UserDelta[];
  totalUsers: number;
  totalEngaged: number;
  message?: string;
}

export interface UserDelta {
  userId: string;
  username: string;
  delta: number | null;
  noInteraction: boolean;
  totalEngagement: number;
}

export interface DeltaComparisonParams {
  referenceUserId: string;
  requestingUserId: string;
  snapDay: string;
  limit: number;
}

export interface PointClusterResult {
  pointIds: number[];
  rootIds: number[];
  message?: string;
}

/**
 * Check if user has engagement with specific points (fast early exit)
 */
export async function checkUserEngagement(
  userId: string,
  pointIds: number[]
): Promise<boolean> {
  const userEngagement = await db
    .select({
      pointId: endorsementsTable.pointId,
    })
    .from(endorsementsTable)
    .where(
      and(
        eq(endorsementsTable.userId, userId),
        inArray(endorsementsTable.pointId, pointIds),
        sql`${endorsementsTable.cred} > 0`
      )
    )
    .limit(1);

  return userEngagement.length > 0;
}

/**
 * Get or build point clusters for given point IDs
 */
export async function getPointClusters(
  pointIds: number[]
): Promise<PointClusterResult> {
  const rootPoints = await db
    .select({
      rootId: pointClustersTable.rootId,
      pointId: pointClustersTable.pointId,
    })
    .from(pointClustersTable)
    .where(inArray(pointClustersTable.pointId, pointIds));

  const uniqueRootIds = [...new Set(rootPoints.map((rp) => rp.rootId))];

  if (uniqueRootIds.length === 0) {
    return {
      pointIds: [],
      rootIds: [],
      message:
        "Delta analysis requires point clusters to be built. Please contact an administrator to build clusters for this content.",
    };
  }

  const clusterPointIds = await db
    .select({
      pointId: pointClustersTable.pointId,
    })
    .from(pointClustersTable)
    .where(inArray(pointClustersTable.rootId, uniqueRootIds));

  const allPointIds = clusterPointIds.map((cp) => cp.pointId);

  return {
    pointIds: allPointIds,
    rootIds: uniqueRootIds,
  };
}

/**
 * Get users with engagement from snapshots or endorsements
 */
export async function getUsersWithEngagement(
  pointIds: number[],
  referenceUserId: string,
  snapDay: string,
  limit: number
): Promise<
  Array<{ userId: string; username: string | null; totalEngagement: number }>
> {
  const snapDayDate = new Date(snapDay);
  snapDayDate.setHours(0, 0, 0, 0);

  // Try snapshots first
  let usersWithEngagement = await db
    .select({
      userId: snapshotsTable.userId,
      username: usersTable.username,
      totalEngagement:
        sql<number>`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt})`.mapWith(
          Number
        ),
    })
    .from(snapshotsTable)
    .leftJoin(usersTable, eq(snapshotsTable.userId, usersTable.id))
    .where(
      and(
        eq(snapshotsTable.snapDay, snapDayDate),
        inArray(snapshotsTable.pointId, pointIds),
        sql`${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt} > 0`,
        ne(snapshotsTable.userId, referenceUserId)
      )
    )
    .groupBy(snapshotsTable.userId, usersTable.username)
    .having(
      sql`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt}) > 0`
    )
    .orderBy(
      sql`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt}) DESC`
    )
    .limit(Math.min(limit * 2, 100));

  // Fallback to endorsements if no snapshot data
  if (usersWithEngagement.length === 0) {
    usersWithEngagement = await db
      .select({
        userId: endorsementsTable.userId,
        username: usersTable.username,
        totalEngagement: sql<number>`SUM(${endorsementsTable.cred})`.mapWith(
          Number
        ),
      })
      .from(endorsementsTable)
      .leftJoin(usersTable, eq(endorsementsTable.userId, usersTable.id))
      .where(
        and(
          inArray(endorsementsTable.pointId, pointIds),
          sql`${endorsementsTable.cred} > 0`,
          ne(endorsementsTable.userId, referenceUserId)
        )
      )
      .groupBy(endorsementsTable.userId, usersTable.username)
      .having(sql`SUM(${endorsementsTable.cred}) > 0`)
      .orderBy(sql`SUM(${endorsementsTable.cred}) DESC`)
      .limit(Math.min(limit * 2, 100));
  }

  return usersWithEngagement;
}

/**
 * Compute delta comparisons for a list of users
 */
export async function computeDeltaComparisons(
  users: Array<{
    userId: string;
    username: string | null;
    totalEngagement: number;
  }>,
  params: DeltaComparisonParams,
  computeFunction: (
    userAId: string,
    userBId: string,
    ...args: any[]
  ) => Promise<any>,
  ...computeArgs: any[]
): Promise<UserDelta[]> {
  const deltaResults = await Promise.all(
    users.map(async (user) => {
      try {
        const result = await computeFunction(
          params.referenceUserId,
          user.userId,
          ...computeArgs,
          params.snapDay,
          params.requestingUserId
        );

        return {
          userId: user.userId,
          username: user.username || "Unknown",
          delta: result.delta,
          noInteraction: result.noInteraction,
          totalEngagement: user.totalEngagement,
        };
      } catch (error) {
        return {
          userId: user.userId,
          username: user.username || "Unknown",
          delta: null,
          noInteraction: true,
          totalEngagement: user.totalEngagement,
        };
      }
    })
  );

  return deltaResults;
}

/**
 * Process delta results and return most similar/different users
 */
export async function processDeltaResults(
  deltaResults: UserDelta[],
  limit: number,
  totalEngaged: number
): Promise<DeltaComparisonResult> {
  const validDeltas = deltaResults.filter(
    (r) => r.delta !== null && !r.noInteraction
  );

  if (validDeltas.length === 0) {
    // Distinguish between different reasons for no comparable users
    const usersWithNoInteraction = deltaResults.filter(
      (r) => r.noInteraction
    ).length;
    const usersWithErrors = deltaResults.filter(
      (r) => r.delta === null && !r.noInteraction
    ).length;

    let message = "No comparable users found";
    if (totalEngaged === 0) {
      message = "No other users have engaged with these points";
    } else if (usersWithNoInteraction === deltaResults.length) {
      message = "You haven't engaged with the same points as other users";
    } else if (usersWithErrors > 0) {
      message =
        "Unable to compute comparisons - there may be insufficient shared engagement data";
    }

    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: totalEngaged,
      totalEngaged,
      message,
    };
  }

  const sortedByDelta = [...validDeltas].sort(
    (a, b) => (a.delta || 0) - (b.delta || 0)
  );

  const requestedLimit = Math.min(limit, validDeltas.length);
  const mostSimilar = sortedByDelta.slice(0, requestedLimit);

  const mostSimilarUserIds = new Set(mostSimilar.map((u) => u.userId));
  const remainingUsers = sortedByDelta.filter(
    (u) => !mostSimilarUserIds.has(u.userId)
  );

  const mostDifferent = remainingUsers
    .sort((a, b) => (b.delta || 0) - (a.delta || 0))
    .slice(0, Math.min(requestedLimit, remainingUsers.length));

  return {
    mostSimilar,
    mostDifferent,
    totalUsers: validDeltas.length,
    totalEngaged,
  };
}

/**
 * Get points from rationale ID
 */
export async function getPointsFromRationale(
  rationaleId: string
): Promise<number[]> {
  const rationalePoints = await db
    .select({
      pointId: rationalePointsTable.pointId,
    })
    .from(rationalePointsTable)
    .where(eq(rationalePointsTable.rationaleId, rationaleId));

  return rationalePoints.map((rp) => rp.pointId);
}

/**
 * Get points from topic ID (via rationales)
 */
export async function getPointsFromTopic(topicId: number): Promise<number[]> {
  const rationales = await db
    .select({
      id: viewpointsTable.id,
    })
    .from(viewpointsTable)
    .where(eq(viewpointsTable.topicId, topicId));

  if (rationales.length === 0) {
    return [];
  }

  const rationaleIds = rationales.map((r) => r.id);
  const pointMappings = await db
    .select({
      pointId: rationalePointsTable.pointId,
    })
    .from(rationalePointsTable)
    .where(inArray(rationalePointsTable.rationaleId, rationaleIds));

  return [...new Set(pointMappings.map((pm) => pm.pointId))];
}

/**
 * Main delta comparison service - handles rationale comparisons
 */
export async function handleRationaleComparison({
  referenceUserId,
  rationaleId,
  snapDay,
  limit = 20,
  requestingUserId,
}: {
  referenceUserId: string;
  rationaleId: string;
  snapDay: string;
  limit?: number;
  requestingUserId: string;
}): Promise<DeltaComparisonResult> {
  // Get points from rationale
  const pointIds = await getPointsFromRationale(rationaleId);

  if (pointIds.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message:
        "No points found in rationale - bridge table may need to be populated",
    };
  }

  // Check user engagement first (fast early exit)
  const hasEngagement = await checkUserEngagement(referenceUserId, pointIds);
  if (!hasEngagement) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: "You haven't engaged with any points in this rationale yet",
    };
  }

  // Get clusters
  const clusterResult = await getPointClusters(pointIds);
  if (clusterResult.message) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: clusterResult.message,
    };
  }

  // Get users with engagement
  const usersWithEngagement = await getUsersWithEngagement(
    clusterResult.pointIds,
    referenceUserId,
    snapDay,
    limit
  );

  if (usersWithEngagement.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message:
        "No other users have engaged with this rationale's point clusters",
    };
  }

  // Compute deltas
  const deltaResults = await computeDeltaComparisons(
    usersWithEngagement,
    { referenceUserId, requestingUserId, snapDay, limit },
    (
      userAId: string,
      userBId: string,
      rationaleId: string,
      snapDay: string,
      requestingUserId: string
    ) =>
      computeRationaleDelta({
        userAId,
        userBId,
        rationaleId,
        snapDay,
        requestingUserId,
      }),
    rationaleId
  );

  // Process and return results
  return processDeltaResults(deltaResults, limit, usersWithEngagement.length);
}

/**
 * Main delta comparison service - handles bulk comparisons
 */
export async function handleBulkComparison({
  referenceUserId,
  rootPointId,
  snapDay,
  limit = 20,
  requestingUserId,
}: {
  referenceUserId: string;
  rootPointId: number;
  snapDay: string;
  limit?: number;
  requestingUserId: string;
}): Promise<DeltaComparisonResult> {
  // Check user engagement first (fast early exit)
  const hasEngagement = await checkUserEngagement(referenceUserId, [
    rootPointId,
  ]);
  if (!hasEngagement) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: "You haven't engaged with this point yet",
    };
  }

  // Get cluster points
  const cluster = await db
    .select({
      pointId: pointClustersTable.pointId,
    })
    .from(pointClustersTable)
    .where(eq(pointClustersTable.rootId, rootPointId));

  if (cluster.length === 0) {
    console.log(
      `[deltaComparison] No cluster found for root point ${rootPointId}. Clusters should be pre-built offline.`
    );

    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message:
        "Delta analysis requires point clusters to be built. Please contact an administrator to build clusters for this content.",
    };
  }

  const pointIds = cluster.map((c) => c.pointId);

  const usersWithEngagement = await getUsersWithEngagement(
    pointIds,
    referenceUserId,
    snapDay,
    limit
  );

  if (usersWithEngagement.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: "No users have engaged with this point cluster yet",
    };
  }

  const deltaResults = await computeDeltaComparisons(
    usersWithEngagement,
    { referenceUserId, requestingUserId, snapDay, limit },
    (
      userAId: string,
      userBId: string,
      rootPointId: number,
      snapDay: string,
      requestingUserId: string
    ) =>
      computeDelta({
        userAId,
        userBId,
        rootPointId,
        snapDay,
      }),
    rootPointId
  );

  return processDeltaResults(deltaResults, limit, usersWithEngagement.length);
}

/**
 * Main delta comparison service - handles topic comparisons
 */
export async function handleTopicComparison({
  referenceUserId,
  topicId,
  snapDay,
  limit = 20,
  requestingUserId,
}: {
  referenceUserId: string;
  topicId: number;
  snapDay: string;
  limit?: number;
  requestingUserId: string;
}): Promise<DeltaComparisonResult> {
  const pointIds = await getPointsFromTopic(topicId);

  if (pointIds.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: "No valid points found in topic rationales",
    };
  }

  const hasEngagement = await checkUserEngagement(referenceUserId, pointIds);
  if (!hasEngagement) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: "You haven't engaged with any points in this topic yet",
    };
  }

  const clusterResult = await getPointClusters(pointIds);
  if (clusterResult.message) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: clusterResult.message,
    };
  }

  const usersWithEngagement = await getUsersWithEngagement(
    clusterResult.pointIds,
    referenceUserId,
    snapDay,
    limit
  );

  if (usersWithEngagement.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: "No other users have engaged with this topic's point clusters",
    };
  }

  try {
    const { computeTopicDelta } = await import(
      "@/actions/analytics/deltaAggregation"
    );
    const deltaResults = await computeDeltaComparisons(
      usersWithEngagement,
      { referenceUserId, requestingUserId, snapDay, limit },
      (
        userAId: string,
        userBId: string,
        topicId: number,
        snapDay: string,
        requestingUserId: string
      ) =>
        computeTopicDelta({
          userAId,
          userBId,
          topicId,
          snapDay,
          requestingUserId,
        }),
      topicId
    );

    return processDeltaResults(deltaResults, limit, usersWithEngagement.length);
  } catch (error) {
    console.error(`[handleTopicComparison] Error in delta computation:`, error);
    throw error;
  }
}

/**
 * Main delta comparison service - handles user comparisons
 */
export async function handleUserComparison({
  referenceUserId,
  targetUserId,
  snapDay,
  limit = 20,
  requestingUserId,
}: {
  referenceUserId: string;
  targetUserId: string;
  snapDay: string;
  limit?: number;
  requestingUserId: string;
}): Promise<DeltaComparisonResult> {
  const targetUserPoints = await db
    .select({
      pointId: pointsTable.id,
    })
    .from(pointsTable)
    .where(eq(pointsTable.createdBy, targetUserId));

  if (targetUserPoints.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: "Target user has not created any points yet",
    };
  }

  const pointIds = targetUserPoints.map((p) => p.pointId);

  const rootPoints = await db
    .select({
      rootId: pointClustersTable.rootId,
    })
    .from(pointClustersTable)
    .where(inArray(pointClustersTable.pointId, pointIds));

  const uniqueRootIds = [...new Set(rootPoints.map((rp) => rp.rootId))];

  if (uniqueRootIds.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: "No point clusters found for target user's points",
    };
  }

  const snapDayDate = new Date(snapDay);
  snapDayDate.setHours(0, 0, 0, 0);

  let usersWithEngagement = await db
    .select({
      userId: snapshotsTable.userId,
      username: usersTable.username,
      totalEngagement:
        sql<number>`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt})`.mapWith(
          Number
        ),
    })
    .from(snapshotsTable)
    .leftJoin(usersTable, eq(snapshotsTable.userId, usersTable.id))
    .leftJoin(
      pointClustersTable,
      eq(snapshotsTable.pointId, pointClustersTable.pointId)
    )
    .where(
      and(
        eq(snapshotsTable.snapDay, snapDayDate),
        inArray(pointClustersTable.rootId, uniqueRootIds),
        sql`${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt} > 0`,
        ne(snapshotsTable.userId, referenceUserId),
        ne(snapshotsTable.userId, targetUserId)
      )
    )
    .groupBy(snapshotsTable.userId, usersTable.username)
    .having(
      sql`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt}) > 0`
    )
    .orderBy(
      sql`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt}) DESC`
    )
    .limit(Math.min(limit * 2, 100));

  if (usersWithEngagement.length === 0) {
    const clusterPointIds = await db
      .select({
        pointId: pointClustersTable.pointId,
      })
      .from(pointClustersTable)
      .where(inArray(pointClustersTable.rootId, uniqueRootIds));

    const allPointIds = clusterPointIds.map((cp) => cp.pointId);

    usersWithEngagement = await db
      .select({
        userId: endorsementsTable.userId,
        username: usersTable.username,
        totalEngagement: sql<number>`SUM(${endorsementsTable.cred})`.mapWith(
          Number
        ),
      })
      .from(endorsementsTable)
      .leftJoin(usersTable, eq(endorsementsTable.userId, usersTable.id))
      .where(
        and(
          inArray(endorsementsTable.pointId, allPointIds),
          sql`${endorsementsTable.cred} > 0`,
          ne(endorsementsTable.userId, referenceUserId),
          ne(endorsementsTable.userId, targetUserId)
        )
      )
      .groupBy(endorsementsTable.userId, usersTable.username)
      .having(sql`SUM(${endorsementsTable.cred}) > 0`)
      .orderBy(sql`SUM(${endorsementsTable.cred}) DESC`)
      .limit(Math.min(limit * 2, 100));
  }

  if (usersWithEngagement.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message:
        "No other users have engaged with the target user's point clusters",
    };
  }

  const deltaResults = await Promise.all(
    usersWithEngagement.map(async (user) => {
      try {
        const clusterDeltas = await Promise.all(
          uniqueRootIds.map(async (rootId) => {
            const result = await computeDelta({
              userAId: referenceUserId,
              userBId: user.userId,
              rootPointId: rootId,
              snapDay: snapDay,
            });
            return result.delta;
          })
        );

        const validDeltas = clusterDeltas.filter(
          (d): d is number => d !== null
        );
        const avgDelta =
          validDeltas.length > 0
            ? validDeltas.reduce((sum, d) => sum + d, 0) / validDeltas.length
            : null;

        return {
          userId: user.userId,
          username: user.username || "Unknown",
          delta: avgDelta,
          noInteraction: avgDelta === null,
          totalEngagement: user.totalEngagement,
        };
      } catch (error) {
        return {
          userId: user.userId,
          username: user.username || "Unknown",
          delta: null,
          noInteraction: true,
          totalEngagement: user.totalEngagement,
        };
      }
    })
  );

  return processDeltaResults(deltaResults, limit, usersWithEngagement.length);
}

/**
 * Main delta comparison service - handles space comparisons
 */
export async function handleSpaceComparison({
  referenceUserId,
  spaceId,
  snapDay,
  limit = 20,
  requestingUserId,
}: {
  referenceUserId: string;
  spaceId: string;
  snapDay: string;
  limit?: number;
  requestingUserId: string;
}): Promise<DeltaComparisonResult> {
  const spacePoints = await db
    .select({
      pointId: pointsTable.id,
    })
    .from(pointsTable)
    .where(eq(pointsTable.space, spaceId));

  const spaceRationales = await db
    .select({
      id: viewpointsTable.id,
    })
    .from(viewpointsTable)
    .where(eq(viewpointsTable.space, spaceId));

  const rationaleIds = spaceRationales.map((r) => r.id);
  const rationalePointMappings =
    rationaleIds.length > 0
      ? await db
          .select({
            pointId: rationalePointsTable.pointId,
          })
          .from(rationalePointsTable)
          .where(inArray(rationalePointsTable.rationaleId, rationaleIds))
      : [];

  const rationalePointIds = rationalePointMappings.map((rp) => rp.pointId);

  const allSpacePointIds = [
    ...spacePoints.map((p) => p.pointId),
    ...rationalePointIds,
  ];
  const uniquePointIds = [...new Set(allSpacePointIds)];

  if (uniquePointIds.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: "No points or rationales found in this space yet",
    };
  }

  const rootPoints = await db
    .select({
      rootId: pointClustersTable.rootId,
      pointId: pointClustersTable.pointId,
    })
    .from(pointClustersTable)
    .where(inArray(pointClustersTable.pointId, uniquePointIds));

  const uniqueRootIds = [...new Set(rootPoints.map((rp) => rp.rootId))];

  if (uniqueRootIds.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message:
        "Space alignment requires point clusters to be built. Contact an administrator if this persists.",
    };
  }

  const clusterPointIds = await db
    .select({
      pointId: pointClustersTable.pointId,
    })
    .from(pointClustersTable)
    .where(inArray(pointClustersTable.rootId, uniqueRootIds));

  const allClusterPointIds = clusterPointIds.map((cp) => cp.pointId);

  // Check user engagement first (fast early exit)
  const hasEngagement = await checkUserEngagement(
    referenceUserId,
    allClusterPointIds
  );
  if (!hasEngagement) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message: "You haven't engaged with any points in this space yet",
    };
  }

  const usersWithEngagement = await getUsersWithEngagement(
    allClusterPointIds,
    referenceUserId,
    snapDay,
    limit
  );

  if (usersWithEngagement.length === 0) {
    return {
      mostSimilar: [],
      mostDifferent: [],
      totalUsers: 0,
      totalEngaged: 0,
      message:
        "No other users have engaged with the same points in this space yet",
    };
  }

  const deltaResults = await Promise.all(
    usersWithEngagement.map(async (user) => {
      try {
        const batch = await computeDeltaBatch({
          userAId: referenceUserId,
          userBId: user.userId,
          rootPointIds: uniqueRootIds,
          snapDay,
        });

        const validDeltas = batch
          .map((b) => b.delta)
          .filter((d): d is number => d !== null);
        const avgDelta =
          validDeltas.length > 0
            ? validDeltas.reduce((sum, d) => sum + d, 0) / validDeltas.length
            : null;

        return {
          userId: user.userId,
          username: user.username || "Unknown",
          delta: avgDelta,
          noInteraction: avgDelta === null,
          totalEngagement: user.totalEngagement,
        };
      } catch (error) {
        return {
          userId: user.userId,
          username: user.username || "Unknown",
          delta: null,
          noInteraction: true,
          totalEngagement: user.totalEngagement,
        };
      }
    })
  );

  return processDeltaResults(deltaResults, limit, usersWithEngagement.length);
}
