"use server";

import { db } from "@/services/db";
import { endorsementsTable, usersTable, pointsTable } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { cosine } from "@/lib/negation-game/deltaScore";

/**
 * DAO-specific delta function that handles cases where users have no engagement
 * Unlike the regular delta function, this treats zero engagement as neutral (0.5 delta)
 * rather than returning null.
 */
function daoAlignmentDelta(
  userVec: number[],
  centroid: number[],
  userId?: string
): number {
  if (userVec.length !== centroid.length) {
    throw new Error(
      `Vector length mismatch: userVec.length=${userVec.length}, centroid.length=${centroid.length}`
    );
  }

  const userHasEngagement = userVec.some((v) => v !== 0);

  // If user has no engagement, they're neutral to the DAO (0.5 delta)
  if (!userHasEngagement) {
    return 0.5;
  }

  // If centroid is empty (shouldn't happen in practice), treat as neutral
  const centroidHasData = centroid.some((v) => v !== 0);
  if (!centroidHasData) {
    console.log(`[daoAlignmentDelta] WARNING: Centroid has no data!`);
    return 0.5;
  }

  // Both have data, compute normal cosine-based delta
  const sim = cosine(userVec, centroid);
  let d = (1 - sim) / 2;

  // Apply small cluster penalty
  if (userVec.length < 3) {
    const missing = 3 - userVec.length;
    const lambda = Math.max(0.7, 1 - 0.1 * missing);
    d *= lambda;
  }

  // Clamp to [0,1]
  if (d < 0) d = 0;
  if (d > 1) d = 1;

  if (userId && userHasEngagement) {
  }

  return d;
}

export interface UserDaoDelta {
  userId: string;
  username: string | null;
  delta: number;
}

export async function computeUsersDaoAlignment({
  snapDay = new Date().toISOString().slice(0, 10),
  limit = 10,
  spaceId,
}: {
  snapDay?: string;
  limit?: number;
  spaceId?: string;
}): Promise<{ mostSimilar: UserDaoDelta[]; mostDifferent: UserDaoDelta[] }> {
  const snapDate = new Date(snapDay);

  let endorseRows;

  if (spaceId) {
    endorseRows = await db
      .select({
        userId: endorsementsTable.userId,
        pointId: endorsementsTable.pointId,
        cred: endorsementsTable.cred,
      })
      .from(endorsementsTable)
      .innerJoin(pointsTable, eq(endorsementsTable.pointId, pointsTable.id))
      .where(eq(pointsTable.space, spaceId));
  } else {
    endorseRows = await db
      .select({
        userId: endorsementsTable.userId,
        pointId: endorsementsTable.pointId,
        cred: endorsementsTable.cred,
      })
      .from(endorsementsTable);
  }

  if (endorseRows.length === 0) {
    return { mostSimilar: [], mostDifferent: [] };
  }

  const totalCred: Record<string, number> = {};
  endorseRows.forEach((r) => {
    totalCred[r.userId] = (totalCred[r.userId] || 0) + r.cred;
  });

  const pSet = new Set<number>();
  endorseRows.forEach((r) => pSet.add(r.pointId));
  const pointIds = Array.from(pSet);
  const idxMap = new Map<number, number>();
  pointIds.forEach((pid, i) => idxMap.set(pid, i));

  const userVecs = new Map<string, number[]>();
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

  if (userVecs.size < 2) {
    return { mostSimilar: [], mostDifferent: [] };
  }

  const centroid = new Array(pointIds.length).fill(0);
  for (const vec of userVecs.values()) {
    for (let i = 0; i < pointIds.length; i++) {
      centroid[i] += vec[i];
    }
  }
  for (let i = 0; i < pointIds.length; i++) centroid[i] /= userVecs.size;

  const deltas: UserDaoDelta[] = [];
  let spaceUserIds: string[] = [];
  if (spaceId) {
    const spaceEngagedUsers = await db
      .select({ userId: endorsementsTable.userId })
      .from(endorsementsTable)
      .innerJoin(pointsTable, eq(endorsementsTable.pointId, pointsTable.id))
      .where(eq(pointsTable.space, spaceId));

    spaceUserIds = [...new Set(spaceEngagedUsers.map((u) => u.userId))];
  } else {
    const allUsers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.isActive as any, true));
    spaceUserIds = allUsers.map((u) => u.id);
  }

  const usernames = await db
    .select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable)
    .where(inArray(usersTable.id, spaceUserIds));

  for (const user of usernames) {
    const vec = userVecs.get(user.id) || new Array(pointIds.length).fill(0);
    const d = daoAlignmentDelta(vec, centroid, user.id);
    deltas.push({ userId: user.id, username: user.username, delta: d });
  }

  console.log(`[computeUsersDaoAlignment] Computed ${deltas.length} deltas`);
  if (deltas.length === 0) {
    return { mostSimilar: [], mostDifferent: [] };
  }

  const sorted = deltas.sort((a, b) => a.delta - b.delta);
  const mostSimilar = sorted.slice(0, limit);
  const mostDifferent = sorted.slice(-limit).reverse();
  return { mostSimilar, mostDifferent };
}
