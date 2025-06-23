"use server";

import { db } from "@/services/db";
import { dailyStancesTable, endorsementsTable, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { delta as deltaFn } from "@/lib/negation-game/deltaScore";

export interface UserDaoDelta {
  userId: string;
  username: string | null;
  delta: number;
}

export async function computeUsersDaoAlignment({
  snapDay = new Date().toISOString().slice(0, 10),
  limit = 10,
}: {
  snapDay?: string;
  limit?: number;
}): Promise<{ mostSimilar: UserDaoDelta[]; mostDifferent: UserDaoDelta[] }> {
  const snapDate = new Date(snapDay);

  const stanceRows = await db
    .select({
      userId: dailyStancesTable.userId,
      pointId: dailyStancesTable.pointId,
      z: dailyStancesTable.zValue,
    })
    .from(dailyStancesTable)
    .where(eq(dailyStancesTable.snapDay, snapDate));

  let userVecs: Map<string, number[]> = new Map();
  let pointIds: number[] = [];

  if (stanceRows.length === 0) {
    const endorseRows = await db
      .select({
        userId: endorsementsTable.userId,
        pointId: endorsementsTable.pointId,
        cred: endorsementsTable.cred,
      })
      .from(endorsementsTable);

    if (endorseRows.length === 0) return { mostSimilar: [], mostDifferent: [] };

    const totalCred: Record<string, number> = {};
    endorseRows.forEach((r) => {
      totalCred[r.userId] = (totalCred[r.userId] || 0) + r.cred;
    });

    const pSet = new Set<number>();
    endorseRows.forEach((r) => pSet.add(r.pointId));
    pointIds = Array.from(pSet);
    const idxMap = new Map<number, number>();
    pointIds.forEach((pid, i) => idxMap.set(pid, i));

    userVecs = new Map();
    endorseRows.forEach((r) => {
      let vec = userVecs.get(r.userId);
      if (!vec) {
        vec = new Array(pointIds.length).fill(0);
        userVecs.set(r.userId, vec);
      }
      const idx = idxMap.get(r.pointId)!;
      const denom = totalCred[r.userId] || 1;
      vec[idx] = r.cred / denom;
    });
  } else {
    const pSet = new Set<number>();
    stanceRows.forEach((r) => pSet.add(r.pointId));
    pointIds = Array.from(pSet);
    const idxMap = new Map<number, number>();
    pointIds.forEach((pid, i) => idxMap.set(pid, i));

    userVecs = new Map();
    stanceRows.forEach((r) => {
      let vec = userVecs.get(r.userId);
      if (!vec) {
        vec = new Array(pointIds.length).fill(0);
        userVecs.set(r.userId, vec);
      }
      vec[idxMap.get(r.pointId)!] = r.z;
    });
  }

  if (userVecs.size < 2) return { mostSimilar: [], mostDifferent: [] };

  const centroid = new Array(pointIds.length).fill(0);
  for (const vec of userVecs.values()) {
    for (let i = 0; i < pointIds.length; i++) {
      centroid[i] += vec[i];
    }
  }
  for (let i = 0; i < pointIds.length; i++) centroid[i] /= userVecs.size;

  const deltas: UserDaoDelta[] = [];
  const usernames = await db
    .select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.isActive as any, true));
  const nameMap: Record<string, string | null> = {};
  usernames.forEach((u) => (nameMap[u.id] = u.username));

  for (const [userId, vec] of userVecs.entries()) {
    const d = deltaFn(vec, centroid);
    if (d !== null) {
      deltas.push({ userId, username: nameMap[userId] || null, delta: d });
    }
  }

  if (deltas.length === 0) return { mostSimilar: [], mostDifferent: [] };

  const sorted = deltas.sort((a, b) => a.delta - b.delta);
  const mostSimilar = sorted.slice(0, limit);
  const mostDifferent = sorted.slice(-limit).reverse();

  return { mostSimilar, mostDifferent };
}
