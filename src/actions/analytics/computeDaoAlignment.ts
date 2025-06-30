"use server";

import { db } from "@/services/db";
import { dailyStancesTable, endorsementsTable, pointsTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Compute an overall alignment score for the entire DAO (all users, all points)
 * for a given snapshot day. The score is the mean pair-wise Δ among a random
 * sample of user pairs. The lower the score, the more the community tends to
 * agree; 1 means perfectly polarised.
 */
export async function computeDaoAlignment({
  snapDay = new Date().toISOString().slice(0, 10),
  samplePairs = 1000,
  space,
}: {
  /** YYYY-MM-DD */
  snapDay?: string;
  /** how many random user pairs to sample (max) */
  samplePairs?: number;
  /** space to filter by, omit for global */
  space?: string;
}): Promise<{
  delta: number | null;
  userCount: number;
  pairCount: number;
}> {
  const snapDate = new Date(snapDay + "T00:00:00.000Z");

  const rows = await db
    .select({
      userId: dailyStancesTable.userId,
      pointId: dailyStancesTable.pointId,
      z: dailyStancesTable.zValue,
    })
    .from(dailyStancesTable)
    .where(
      space
        ? and(
            eq(dailyStancesTable.snapDay, snapDate),
            sql`EXISTS (
              SELECT 1 FROM ${pointsTable} p 
              WHERE p.id = ${dailyStancesTable.pointId} 
              AND p.space = ${space}
            )`
          )
        : eq(dailyStancesTable.snapDay, snapDate)
    );

  // We will progressively build these structures regardless of source
  let userMap: Map<string, number[]> = new Map();
  let pointIds: number[] = [];

  if (rows.length === 0) {
    const endorseRows = await db
      .select({
        userId: endorsementsTable.userId,
        pointId: endorsementsTable.pointId,
        cred: endorsementsTable.cred,
      })
      .from(endorsementsTable)
      .where(
        space
          ? sql`EXISTS (
              SELECT 1 FROM ${pointsTable} p 
              WHERE p.id = ${endorsementsTable.pointId} 
              AND p.space = ${space}
            )`
          : sql`TRUE`
      );

    if (endorseRows.length === 0) {
      return { delta: null, userCount: 0, pairCount: 0 };
    }

    const totalCred: Record<string, number> = {};
    for (const r of endorseRows) {
      totalCred[r.userId] = (totalCred[r.userId] || 0) + r.cred;
    }

    const pSet = new Set<number>();
    endorseRows.forEach((r) => pSet.add(r.pointId));
    const pIds = Array.from(pSet);
    const pIdx = new Map<number, number>();
    pIds.forEach((pid, i) => pIdx.set(pid, i));

    const uMap: Map<string, number[]> = new Map();
    for (const r of endorseRows) {
      let vec = uMap.get(r.userId);
      if (!vec) {
        vec = new Array(pIds.length).fill(0);
        uMap.set(r.userId, vec);
      }
      const idx = pIdx.get(r.pointId)!;
      const denom = totalCred[r.userId] || 1;
      vec[idx] = r.cred / denom; // sign assumed +1
    }

    userMap = uMap;
    pointIds = pIds;
  } else {
    const nonZeroCount = rows.filter((r) => Math.abs(r.z) > 0.01).length;
    if (nonZeroCount === 0) {
      const endorseRows = await db
        .select({
          userId: endorsementsTable.userId,
          pointId: endorsementsTable.pointId,
          cred: endorsementsTable.cred,
        })
        .from(endorsementsTable)
        .where(
          space
            ? sql`EXISTS (
                SELECT 1 FROM ${pointsTable} p 
                WHERE p.id = ${endorsementsTable.pointId} 
                AND p.space = ${space}
              )`
            : sql`TRUE`
        );

      if (endorseRows.length === 0) {
        return { delta: null, userCount: 0, pairCount: 0 };
      }

      const totalCred: Record<string, number> = {};
      for (const r of endorseRows) {
        totalCred[r.userId] = (totalCred[r.userId] || 0) + r.cred;
      }

      const pSet = new Set<number>();
      endorseRows.forEach((r) => pSet.add(r.pointId));
      const pIds = Array.from(pSet);
      const pIdx = new Map<number, number>();
      pIds.forEach((pid, i) => pIdx.set(pid, i));

      const uMap: Map<string, number[]> = new Map();
      for (const r of endorseRows) {
        let vec = uMap.get(r.userId);
        if (!vec) {
          vec = new Array(pIds.length).fill(0);
          uMap.set(r.userId, vec);
        }
        const idx = pIdx.get(r.pointId)!;
        const denom = totalCred[r.userId] || 1;
        vec[idx] = r.cred / denom;
      }

      userMap = uMap;
      pointIds = pIds;
    } else {
      // Use the daily_stances data as normal
      const pointSet = new Set<number>();
      for (const r of rows) pointSet.add(r.pointId);
      pointIds = Array.from(pointSet);
      const idxMap = new Map<number, number>();
      pointIds.forEach((pid, i) => idxMap.set(pid, i));

      userMap = new Map<string, number[]>();
      for (const r of rows) {
        let vec = userMap.get(r.userId);
        if (!vec) {
          vec = new Array(pointIds.length).fill(0);
          userMap.set(r.userId, vec);
        }
        const idx = idxMap.get(r.pointId)!;
        vec[idx] = r.z;
      }
    }
  }

  const userIds = [...userMap.keys()];
  const userCount = userIds.length;
  const maxPairs = (userCount * (userCount - 1)) / 2;
  const actualSamplePairs = Math.min(samplePairs, maxPairs);

  if (userCount < 2) {
    return { delta: null, userCount, pairCount: 0 };
  }

  let totalSimilarity = 0;
  let pairCount = 0;

  // Sample random pairs
  const pairsToSample = Math.min(samplePairs, maxPairs);
  const sampledPairs = new Set<string>();

  userIds.slice(0, 3).forEach((userId) => {
    const stances = userMap.get(userId) || [];
  });

  for (
    let attempt = 0;
    attempt < pairsToSample * 2 && pairCount < pairsToSample;
    attempt++
  ) {
    const i = Math.floor(Math.random() * userCount);
    const j = Math.floor(Math.random() * userCount);
    if (i === j) continue;

    const pairKey = `${Math.min(i, j)}-${Math.max(i, j)}`;
    if (sampledPairs.has(pairKey)) continue;
    sampledPairs.add(pairKey);

    const user1Stances = userMap.get(userIds[i]) || [];
    const user2Stances = userMap.get(userIds[j]) || [];

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let k = 0; k < pointIds.length; k++) {
      const stance1 = user1Stances[k] || 0;
      const stance2 = user2Stances[k] || 0;
      dotProduct += stance1 * stance2;
      norm1 += stance1 * stance1;
      norm2 += stance2 * stance2;
    }

    if (norm1 > 0 && norm2 > 0) {
      const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      totalSimilarity += similarity;
      pairCount++;
    }
  }

  if (pairCount === 0) {
    return { delta: null, userCount, pairCount: 0 };
  }

  const avgSimilarity = totalSimilarity / pairCount;
  const delta = (avgSimilarity + 1) / 2; // Convert from [-1, 1] to [0, 1]

  return { delta, userCount, pairCount };
}
