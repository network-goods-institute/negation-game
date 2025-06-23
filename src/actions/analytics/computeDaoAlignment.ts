"use server";

import { db } from "@/services/db";
import { dailyStancesTable, endorsementsTable } from "@/db/schema";
import { delta as deltaFn } from "@/lib/negation-game/deltaScore";
import { eq } from "drizzle-orm";

/**
 * Compute an overall alignment score for the entire DAO (all users, all points)
 * for a given snapshot day. The score is the mean pair-wise Δ among a random
 * sample of user pairs. The lower the score, the more the community tends to
 * agree; 1 means perfectly polarised.
 */
export async function computeDaoAlignment({
  snapDay = new Date().toISOString().slice(0, 10),
  samplePairs = 1000,
}: {
  /** YYYY-MM-DD */
  snapDay?: string;
  /** how many random user pairs to sample (max) */
  samplePairs?: number;
}): Promise<{
  delta: number | null;
  userCount: number;
  pairCount: number;
}> {
  const snapDate = new Date(snapDay);

  const rows = await db
    .select({
      userId: dailyStancesTable.userId,
      pointId: dailyStancesTable.pointId,
      z: dailyStancesTable.zValue,
    })
    .from(dailyStancesTable)
    .where(eq(dailyStancesTable.snapDay, snapDate));

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
      .from(endorsementsTable);

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

  const users = Array.from(userMap.keys());
  const userCount = users.length;
  if (userCount < 2) {
    return { delta: null, userCount, pairCount: 0 };
  }

  const pairs: Array<[string, string]> = [];
  const maxPairs = (userCount * (userCount - 1)) / 2;
  const desired = Math.min(samplePairs, maxPairs);

  const indices = users.map((_, i) => i);
  while (pairs.length < desired) {
    const i = indices[Math.floor(Math.random() * indices.length)];
    let j = indices[Math.floor(Math.random() * indices.length)];
    while (j === i) {
      j = indices[Math.floor(Math.random() * indices.length)];
    }
    const pair: [string, string] = [users[i], users[j]].sort() as [
      string,
      string,
    ];
    if (!pairs.find((p) => p[0] === pair[0] && p[1] === pair[1])) {
      pairs.push(pair);
    }
  }

  let sum = 0;
  let counted = 0;
  for (const [u1, u2] of pairs) {
    const delta = deltaFn(userMap.get(u1)!, userMap.get(u2)!);
    if (delta !== null) {
      sum += delta;
      counted++;
    }
  }

  return {
    delta: counted ? sum / counted : null,
    userCount,
    pairCount: counted,
  };
}
