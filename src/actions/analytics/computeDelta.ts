import { db } from "@/services/db";
import {
  pointClustersTable,
  dailyStancesTable,
  endorsementsTable,
  snapshotsTable,
} from "@/db/schema";
import { delta as deltaFn } from "@/lib/negation-game/deltaScore";
import { and, eq, inArray, sql } from "drizzle-orm";
import { buildPointCluster } from "@/actions/points/buildPointCluster";
import { stanceComputationPipeline } from "./stanceComputationPipeline";

export interface DeltaResult {
  delta: number | null;
  noInteraction: boolean;
  noEngagementBy?: "A" | "B" | "both";
}

export async function computeDelta({
  userAId,
  userBId,
  rootPointId,
  snapDay = new Date().toISOString().slice(0, 10),
}: {
  userAId: string;
  userBId: string;
  rootPointId: number;
  snapDay?: string; // YYYY-MM-DD
}): Promise<DeltaResult> {
  console.log("[computeDelta] params", {
    userAId,
    userBId,
    rootPointId,
    snapDay,
  });

  // Fetch cluster
  let cluster = await db
    .select({
      pointId: pointClustersTable.pointId,
      sign: pointClustersTable.sign,
    })
    .from(pointClustersTable)
    .where(eq(pointClustersTable.rootId, rootPointId));

  if (!cluster.length) {
    console.warn(
      `[computeDelta] Cluster missing for ${rootPointId}; building on-demand.`
    );
    await buildPointCluster(rootPointId);

    const refreshed = await db
      .select({
        pointId: pointClustersTable.pointId,
        sign: pointClustersTable.sign,
      })
      .from(pointClustersTable)
      .where(eq(pointClustersTable.rootId, rootPointId));

    if (!refreshed.length) {
      console.error(
        `[computeDelta] Failed to build cluster for ${rootPointId}.`
      );
      return { delta: null, noInteraction: false };
    }

    cluster = refreshed;
  }

  const pointIds = cluster.map((c) => c.pointId);
  const signMap: Record<number, 1 | -1> = {};
  cluster.forEach((c) => {
    signMap[c.pointId] = (c.sign as 1 | -1) ?? 1;
  });

  console.log("[computeDelta] cluster pointIds", pointIds);

  // Try to get stances from the proper pipeline first
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
        inArray(dailyStancesTable.pointId, pointIds)
      )
    );

  console.log(
    `[computeDelta] Found ${stancesRows.length} stance rows from pipeline`
  );

  // If no stances from pipeline, check if we have snapshots and try to compute them
  if (stancesRows.length === 0) {
    console.log("[computeDelta] No stances from pipeline, checking snapshots");

    const snapshotCount = await db
      .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
      .from(snapshotsTable)
      .where(
        and(
          eq(snapshotsTable.snapDay, new Date(snapDay)),
          inArray(snapshotsTable.userId, [userAId, userBId]),
          inArray(snapshotsTable.pointId, pointIds)
        )
      );

    if (snapshotCount[0]?.count > 0) {
      console.log(
        "[computeDelta] Found snapshots, running stance computation pipeline"
      );
      const pipelineResult = await stanceComputationPipeline(snapDay);

      if (pipelineResult.success) {
        // Retry getting stances after pipeline run
        stancesRows = await db
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
              inArray(dailyStancesTable.pointId, pointIds)
            )
          );

        console.log(
          `[computeDelta] After pipeline: ${stancesRows.length} stance rows`
        );
      }
    }
  }

  // If still no stances, use fallback computation with current endorsements
  if (stancesRows.length === 0) {
    console.log(
      "[computeDelta] No stance data available after pipeline – trying fallback"
    );
    return await computeDeltaFallback(userAId, userBId, pointIds, signMap);
  }

  // Build stance maps and vectors from proper pipeline data
  let mapA: Record<number, number> = {};
  let mapB: Record<number, number> = {};
  for (const row of stancesRows) {
    if (row.userId === userAId) mapA[row.pointId] = row.z;
    else if (row.userId === userBId) mapB[row.pointId] = row.z;
  }

  const aVec: number[] = [];
  const bVec: number[] = [];
  for (const pid of pointIds) {
    aVec.push(mapA[pid] ?? 0);
    bVec.push(mapB[pid] ?? 0);
  }

  console.log("[computeDelta] per-point stance comparison (from pipeline):");
  pointIds.forEach((pid, idx) => {
    console.log(
      `  #${idx.toString().padStart(3, "0")} point ${pid}: sign=${signMap[pid]}, A=${mapA[pid] ?? 0}, B=${mapB[pid] ?? 0}`
    );
  });

  const nzA = aVec.filter((v) => v !== 0).length;
  const nzB = bVec.filter((v) => v !== 0).length;
  console.log(`[computeDelta] non-zero counts -> A: ${nzA}, B: ${nzB}`);

  const aNonZero = aVec.some((v) => v !== 0);
  const bNonZero = bVec.some((v) => v !== 0);

  const result = deltaFn(aVec, bVec);
  console.log(`[computeDelta] Final delta: ${result}`);

  return {
    delta: result,
    noInteraction: result === null,
    noEngagementBy:
      result === null && aNonZero !== bNonZero
        ? aNonZero
          ? "B"
          : "A"
        : result === null && !aNonZero && !bNonZero
          ? "both"
          : undefined,
  };
}

/**
 * Fallback computation using endorsements (backwards compatibility)
 */
async function computeDeltaFallback(
  userAId: string,
  userBId: string,
  pointIds: number[],
  signMap: Record<number, 1 | -1>
): Promise<DeltaResult> {
  console.log("[computeDeltaFallback] Using endorsement-based fallback");

  // Fetch endorsements for both users within these points
  const endorsementRows = await db
    .select({
      pointId: endorsementsTable.pointId,
      userId: endorsementsTable.userId,
      cred: endorsementsTable.cred,
    })
    .from(endorsementsTable)
    .where(
      and(
        inArray(endorsementsTable.userId, [userAId, userBId]),
        inArray(endorsementsTable.pointId, pointIds)
      )
    );

  console.log(
    `[computeDeltaFallback] Found ${endorsementRows.length} endorsement rows`
  );

  if (endorsementRows.length === 0) {
    return { delta: null, noInteraction: true };
  }

  // Build simple stance vectors: sign if endorsed, 0 if not
  const mapA: Record<number, number> = {};
  const mapB: Record<number, number> = {};

  // Get total endorsement cred per user to normalise magnitude (approximation of Tᵤ)
  const totalCredRows = await db
    .select({
      userId: endorsementsTable.userId,
      total: sql<number>`SUM(${endorsementsTable.cred})`.mapWith(Number),
    })
    .from(endorsementsTable)
    .where(inArray(endorsementsTable.userId, [userAId, userBId]))
    .groupBy(endorsementsTable.userId);

  const totalCredMap: Record<string, number> = {};
  for (const row of totalCredRows) {
    totalCredMap[row.userId] = row.total;
  }

  for (const row of endorsementRows) {
    if (row.cred === 0) continue;
    const total = totalCredMap[row.userId] || row.cred; // avoid div0
    const value = (signMap[row.pointId] * row.cred) / total;
    if (row.userId === userAId) mapA[row.pointId] = value;
    else if (row.userId === userBId) mapB[row.pointId] = value;
  }

  const aVec: number[] = [];
  const bVec: number[] = [];
  for (const pid of pointIds) {
    aVec.push(mapA[pid] ?? 0);
    bVec.push(mapB[pid] ?? 0);
  }

  console.log("[computeDeltaFallback] per-point stance comparison (fallback):");
  pointIds.forEach((pid, idx) => {
    console.log(
      `  #${idx.toString().padStart(3, "0")} point ${pid}: sign=${signMap[pid]}, A=${mapA[pid] ?? 0}, B=${mapB[pid] ?? 0}`
    );
  });

  const nzA = aVec.filter((v) => v !== 0).length;
  const nzB = bVec.filter((v) => v !== 0).length;
  console.log(`[computeDeltaFallback] non-zero counts -> A: ${nzA}, B: ${nzB}`);

  const result = deltaFn(aVec, bVec);
  console.log(`[computeDeltaFallback] Final delta: ${result}`);

  const aNonZero = aVec.some((v) => v !== 0);
  const bNonZero = bVec.some((v) => v !== 0);

  return {
    delta: result,
    noInteraction: result === null,
    noEngagementBy:
      result === null && aNonZero !== bNonZero
        ? aNonZero
          ? "B"
          : "A"
        : result === null && !aNonZero && !bNonZero
          ? "both"
          : undefined,
  };
}
