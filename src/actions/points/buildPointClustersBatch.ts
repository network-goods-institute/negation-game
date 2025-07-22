"use server";

import { db } from "@/services/db";
import { pointsTable, pointClustersTable } from "@/db/schema";
import { buildPointCluster } from "./buildPointCluster";
import { eq, sql, notInArray, inArray, and } from "drizzle-orm";

export interface ClusterBuildStats {
  totalPoints: number;
  existingClusters: number;
  newClusters: number;
  failed: number;
  processingTime: number;
}

/**
 * Build clusters for all points that don't have them yet
 * This should be run offline to pre-build clusters before user requests
 */
export async function buildMissingPointClusters({
  limit = 100,
  spaceId,
}: {
  limit?: number;
  spaceId?: string;
} = {}): Promise<ClusterBuildStats> {
  const startTime = Date.now();

  console.log(
    `[buildMissingPointClusters] Starting batch cluster building${spaceId ? ` for space ${spaceId}` : ""}, limit: ${limit}`
  );

  let missingClustersQueryBuilder = db
    .select({
      id: pointsTable.id,
      content: pointsTable.content,
    })
    .from(pointsTable);

  const whereConditions = [eq(pointsTable.isActive, true)];
  if (spaceId) {
    whereConditions.push(eq(pointsTable.space, spaceId));
  }

  const missingClustersQuery = missingClustersQueryBuilder.where(
    and(...whereConditions)
  );
  const existingClustersSubquery = db
    .selectDistinct({
      rootId: pointClustersTable.rootId,
    })
    .from(pointClustersTable);

  const existingClusterIds = await existingClustersSubquery;
  const existingRootIds = existingClusterIds.map((c) => c.rootId);

  let pointsNeedingClusters;
  if (existingRootIds.length > 0) {
    const additionalConditions = [
      ...whereConditions,
      notInArray(pointsTable.id, existingRootIds),
    ];
    pointsNeedingClusters = await missingClustersQueryBuilder
      .where(and(...additionalConditions))
      .limit(limit);
  } else {
    pointsNeedingClusters = await missingClustersQuery.limit(limit);
  }

  console.log(
    `[buildMissingPointClusters] Found ${pointsNeedingClusters.length} points needing clusters`
  );

  if (pointsNeedingClusters.length === 0) {
    return {
      totalPoints: 0,
      existingClusters: existingRootIds.length,
      newClusters: 0,
      failed: 0,
      processingTime: Date.now() - startTime,
    };
  }

  const batchSize = 10;
  let newClusters = 0;
  let failed = 0;

  for (let i = 0; i < pointsNeedingClusters.length; i += batchSize) {
    const batch = pointsNeedingClusters.slice(i, i + batchSize);
    console.log(
      `[buildMissingPointClusters] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pointsNeedingClusters.length / batchSize)}`
    );

    const batchResults = await Promise.allSettled(
      batch.map(async (point: { id: number; content: string }) => {
        try {
          await buildPointCluster(point.id);
          return { success: true, pointId: point.id };
        } catch (error) {
          console.error(
            `[buildMissingPointClusters] Failed to build cluster for point ${point.id}:`,
            error
          );
          return { success: false, pointId: point.id, error };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value.success) {
        newClusters++;
      } else {
        failed++;
      }
    }

    if (i + batchSize < pointsNeedingClusters.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const processingTime = Date.now() - startTime;

  return {
    totalPoints: pointsNeedingClusters.length,
    existingClusters: existingRootIds.length,
    newClusters,
    failed,
    processingTime,
  };
}

/**
 * Build clusters for specific points
 */
export async function buildPointClustersBatch(
  pointIds: number[]
): Promise<ClusterBuildStats> {
  const startTime = Date.now();

  console.log(
    `[buildPointClustersBatch] Building clusters for ${pointIds.length} specific points`
  );

  if (pointIds.length === 0) {
    return {
      totalPoints: 0,
      existingClusters: 0,
      newClusters: 0,
      failed: 0,
      processingTime: 0,
    };
  }

  const existingClusters = await db
    .select({
      rootId: pointClustersTable.rootId,
    })
    .from(pointClustersTable)
    .where(inArray(pointClustersTable.rootId, pointIds));

  const existingRootIds = new Set(existingClusters.map((c) => c.rootId));
  const pointsNeedingClusters = pointIds.filter(
    (id) => !existingRootIds.has(id)
  );

  if (pointsNeedingClusters.length === 0) {
    return {
      totalPoints: pointIds.length,
      existingClusters: existingRootIds.size,
      newClusters: 0,
      failed: 0,
      processingTime: Date.now() - startTime,
    };
  }

  const results = await Promise.allSettled(
    pointsNeedingClusters.map(async (pointId) => {
      try {
        await buildPointCluster(pointId);
        return { success: true, pointId };
      } catch (error) {
        console.error(
          `[buildPointClustersBatch] Failed to build cluster for point ${pointId}:`,
          error
        );
        return { success: false, pointId, error };
      }
    })
  );

  const newClusters = results.filter(
    (r) => r.status === "fulfilled" && r.value.success
  ).length;
  const failed = results.length - newClusters;

  const processingTime = Date.now() - startTime;

  console.log(
    `[buildPointClustersBatch] Completed: ${newClusters} new clusters, ${failed} failed, ${processingTime}ms`
  );

  return {
    totalPoints: pointIds.length,
    existingClusters: existingRootIds.size,
    newClusters,
    failed,
    processingTime,
  };
}

/**
 * Get statistics about cluster coverage
 */
export async function getClusterCoverageStats(spaceId?: string): Promise<{
  totalPoints: number;
  clusteredPoints: number;
  unclustered: number;
  coverage: number;
}> {
  const totalPointsWhereConditions = [eq(pointsTable.isActive, true)];
  if (spaceId) {
    totalPointsWhereConditions.push(eq(pointsTable.space, spaceId));
  }

  const totalPointsQuery = db
    .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(pointsTable)
    .where(and(...totalPointsWhereConditions));

  const totalPointsResult = await totalPointsQuery;
  const totalPoints = totalPointsResult[0]?.count || 0;

  const clusteredPointsResult = await db
    .select({
      count: sql<number>`COUNT(DISTINCT ${pointClustersTable.rootId})`.mapWith(
        Number
      ),
    })
    .from(pointClustersTable);

  const clusteredPoints = clusteredPointsResult[0]?.count || 0;
  const unclustered = totalPoints - clusteredPoints;
  const coverage = totalPoints > 0 ? (clusteredPoints / totalPoints) * 100 : 0;

  return {
    totalPoints,
    clusteredPoints,
    unclustered,
    coverage,
  };
}
