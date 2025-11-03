import { db } from "@/services/db";
import {
  pointClustersTable,
  dailyStancesTable,
  endorsementsTable,
  effectiveRestakesView,
  doubtsTable,
} from "@/db/schema";
import { delta as deltaFn, stance } from "@/lib/negation-game/deltaScore";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { getCachedDelta, setCachedDelta } from "@/lib/deltaCache";import { logger } from "@/lib/logger";

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
  logger.log("[computeDelta] params", {
    userAId,
    userBId,
    rootPointId,
    snapDay,
  });

  const cacheKey = { userAId, userBId, rootPointId, snapDay };
  const cached = getCachedDelta(cacheKey);
  if (cached) {
    return {
      delta: cached.delta,
      noInteraction: cached.noInteraction,
      noEngagementBy: cached.noEngagementBy,
    };
  }

  // Fetch cluster
  let cluster = await db
    .select({
      pointId: pointClustersTable.pointId,
      sign: pointClustersTable.sign,
    })
    .from(pointClustersTable)
    .where(eq(pointClustersTable.rootId, rootPointId));

  if (!cluster.length) {
    return { delta: null, noInteraction: false };
  }

  const pointIds = cluster.map((c) => c.pointId);
  const signMap: Record<number, 1 | -1> = {};
  cluster.forEach((c) => {
    signMap[c.pointId] = (c.sign as 1 | -1) ?? 1;
  });

  logger.log("[computeDelta] cluster pointIds", pointIds);

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

  logger.log(
    `[computeDelta] Found ${stancesRows.length} stance rows from pipeline`
  );

  // If no stances from pipeline, skip snapshot check and go directly to fallback
  // Pipeline computation should be handled offline to avoid blocking user requests
  if (stancesRows.length === 0) {
  }

  // If still no stances, use fallback computation with current endorsements
  if (stancesRows.length === 0) {
    logger.log(
      "[computeDelta] No stance data available after pipeline – trying fallback"
    );
    const fallbackResult = await computeDeltaFallback(
      userAId,
      userBId,
      pointIds,
      signMap
    );

    // Cache the fallback result with shorter TTL since it uses live data
    setCachedDelta(cacheKey, fallbackResult, 2 * 60 * 1000); // 2 minutes for live data

    return fallbackResult;
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

  logger.log("[computeDelta] per-point stance comparison (from pipeline):");
  pointIds.forEach((pid, idx) => {
    logger.log(
      `  #${idx.toString().padStart(3, "0")} point ${pid}: sign=${signMap[pid]}, A=${mapA[pid] ?? 0}, B=${mapB[pid] ?? 0}`
    );
  });

  const nzA = aVec.filter((v) => v !== 0).length;
  const nzB = bVec.filter((v) => v !== 0).length;
  logger.log(`[computeDelta] non-zero counts -> A: ${nzA}, B: ${nzB}`);

  const aNonZero = aVec.some((v) => v !== 0);
  const bNonZero = bVec.some((v) => v !== 0);

  const result = deltaFn(aVec, bVec);
  logger.log(`[computeDelta] Final delta: ${result}`);

  const deltaResult: DeltaResult = {
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

  setCachedDelta(cacheKey, deltaResult);

  return deltaResult;
}

/**
 * Fallback computation
 */
async function computeDeltaFallback(
  userAId: string,
  userBId: string,
  pointIds: number[],
  signMap: Record<number, 1 | -1>
): Promise<DeltaResult> {
  const [endorsementRows, restakeRows, doubtRows] = await Promise.all([
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
          inArray(endorsementsTable.pointId, pointIds)
        )
      ),

    // Get current restakes (using effectiveRestakesView for live amounts)
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
            inArray(effectiveRestakesView.pointId, pointIds),
            inArray(effectiveRestakesView.negationId, pointIds)
          ),
          sql`${effectiveRestakesView.effectiveAmount} > 0`
        )
      ),

    // Get current doubts
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
            inArray(doubtsTable.pointId, pointIds),
            inArray(doubtsTable.negationId, pointIds)
          ),
          sql`${doubtsTable.amount} > 0`
        )
      ),
  ]);

  // Get total cred per user across ALL their points (spec-compliant Tᵤ calculation)
  const totalCredRows = await db
    .select({
      userId: endorsementsTable.userId,
      totalEndorse:
        sql<number>`COALESCE(SUM(${endorsementsTable.cred}), 0)`.mapWith(
          Number
        ),
    })
    .from(endorsementsTable)
    .where(inArray(endorsementsTable.userId, [userAId, userBId]))
    .groupBy(endorsementsTable.userId);

  const totalRestakeRows = await db
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
    .groupBy(effectiveRestakesView.userId);

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

  const engagementA: Record<
    number,
    { endorse: number; restake: number; doubt: number }
  > = {};
  const engagementB: Record<
    number,
    { endorse: number; restake: number; doubt: number }
  > = {};

  for (const pointId of pointIds) {
    engagementA[pointId] = { endorse: 0, restake: 0, doubt: 0 };
    engagementB[pointId] = { endorse: 0, restake: 0, doubt: 0 };
  }

  for (const row of endorsementRows) {
    if (row.userId === userAId) {
      engagementA[row.pointId].endorse = row.cred;
    } else if (row.userId === userBId) {
      engagementB[row.pointId].endorse = row.cred;
    }
  }

  for (const row of restakeRows) {
    if (row.userId === userAId) {
      engagementA[row.pointId].restake = row.amount;
    } else if (row.userId === userBId) {
      engagementB[row.pointId].restake = row.amount;
    }
  }

  for (const row of doubtRows) {
    if (row.userId === userAId) {
      engagementA[row.pointId].doubt = row.amount;
    } else if (row.userId === userBId) {
      engagementB[row.pointId].doubt = row.amount;
    }
  }

  const aVec: number[] = [];
  const bVec: number[] = [];
  for (const pid of pointIds) {
    const engA = engagementA[pid];
    const engB = engagementB[pid];
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

  logger.log("[computeDeltaFallback] per-point stance comparison (fallback):");
  pointIds.forEach((pid, idx) => {
    const engA = engagementA[pid];
    const engB = engagementB[pid];
    const stanceA = aVec[idx];
    const stanceB = bVec[idx];
    logger.log(
      `  #${idx.toString().padStart(3, "0")} point ${pid}: sign=${signMap[pid]}, E_A=${engA.endorse}, R_A=${engA.restake}, D_A=${engA.doubt}, stance_A=${stanceA.toFixed(4)}, E_B=${engB.endorse}, R_B=${engB.restake}, D_B=${engB.doubt}, stance_B=${stanceB.toFixed(4)}`
    );
  });

  const nzA = aVec.filter((v) => v !== 0).length;
  const nzB = bVec.filter((v) => v !== 0).length;
  logger.log(`[computeDeltaFallback] non-zero counts -> A: ${nzA}, B: ${nzB}`);

  const result = deltaFn(aVec, bVec);
  logger.log(`[computeDeltaFallback] Final delta: ${result}`);

  const aNonZero = aVec.some((v) => v !== 0);
  const bNonZero = bVec.some((v) => v !== 0);

  const deltaResult: DeltaResult = {
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

  return deltaResult;
}
