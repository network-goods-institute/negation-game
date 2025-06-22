import { db } from "@/services/db";
import {
  pointClustersTable,
  dailyStancesTable,
  endorsementsTable,
} from "@/db/schema";
import { delta as deltaFn } from "@/lib/negation-game/deltaScore";
import { and, eq, inArray, sql } from "drizzle-orm";
import { buildPointCluster } from "@/actions/points/buildPointCluster";

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
}): Promise<{ delta: number | null; noInteraction: boolean }> {
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

  console.log("[computeDelta] cluster pointIds", pointIds);

  if (stancesRows.length === 0) {
    console.log("[computeDelta] inserting zero snapshots for today");
    const today = new Date(snapDay);
    // Prepare rows with simple endorsement-based stance (sign or 0)
    const rowsToInsert: {
      snapDay: Date;
      userId: string;
      pointId: number;
      zValue: number;
    }[] = [];

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
      `[computeDelta] endorsement rows fetched: ${endorsementRows.length}`
    );
    const hasEndorse: Record<string, Set<number>> = {};
    for (const row of endorsementRows) {
      if (!hasEndorse[row.userId]) hasEndorse[row.userId] = new Set<number>();
      hasEndorse[row.userId].add(row.pointId);
    }

    console.log(
      "[computeDelta] endorsement map",
      Object.fromEntries(
        Object.entries(hasEndorse).map(([k, v]) => [k, Array.from(v)])
      )
    );

    for (const pid of pointIds) {
      for (const uid of [userAId, userBId]) {
        const endorsed = hasEndorse[uid]?.has(pid) ?? false;
        const zVal = endorsed ? signMap[pid] : 0;
        rowsToInsert.push({
          snapDay: today,
          userId: uid,
          pointId: pid,
          zValue: zVal,
        });
      }
    }

    if (rowsToInsert.length) {
      await db
        .insert(dailyStancesTable)
        .values(rowsToInsert)
        .onConflictDoUpdate({
          target: [
            dailyStancesTable.snapDay,
            dailyStancesTable.userId,
            dailyStancesTable.pointId,
          ],
          set: { zValue: sql`EXCLUDED.z_value` },
        });
    }

    // requery
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
  }

  console.log("[computeDelta] stancesRows", stancesRows.length);

  // Build stance maps and vectors
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

  console.log("[computeDelta] per-point stance comparison:");
  pointIds.forEach((pid, idx) => {
    console.log(
      `  #${idx.toString().padStart(3, "0")} point ${pid}: sign=${signMap[pid]}, A=${mapA[pid] ?? 0}, B=${mapB[pid] ?? 0}`
    );
  });

  const nzA = aVec.filter((v) => v !== 0).length;
  const nzB = bVec.filter((v) => v !== 0).length;
  console.log(`[computeDelta] non-zero counts -> A: ${nzA}, B: ${nzB}`);
  console.log("[computeDelta] aVec (first 10)", aVec.slice(0, 10));
  console.log("[computeDelta] bVec (first 10)", bVec.slice(0, 10));

  const bothZero = nzA === 0 && nzB === 0;
  if (bothZero) {
    console.log(
      "[computeDelta] Both vectors zero; attempting live endorsement-based stance rebuild"
    );

    // Fetch endorsements again (may have existed previously)
    const endorsementRows = await db
      .select({
        pointId: endorsementsTable.pointId,
        userId: endorsementsTable.userId,
      })
      .from(endorsementsTable)
      .where(
        and(
          inArray(endorsementsTable.userId, [userAId, userBId]),
          inArray(endorsementsTable.pointId, pointIds)
        )
      );

    console.log(
      "[computeDelta] endorsement rows for rebuild",
      endorsementRows.length
    );

    if (endorsementRows.length) {
      const today = new Date(snapDay);
      const rowsToUpsert = endorsementRows.map((r) => ({
        snapDay: today,
        userId: r.userId,
        pointId: r.pointId,
        zValue: signMap[r.pointId],
      }));

      await db
        .insert(dailyStancesTable)
        .values(rowsToUpsert)
        .onConflictDoUpdate({
          target: [
            dailyStancesTable.snapDay,
            dailyStancesTable.userId,
            dailyStancesTable.pointId,
          ],
          set: { zValue: sql`EXCLUDED.z_value` },
        });

      // rebuild vectors
      stancesRows = await db
        .select({
          userId: dailyStancesTable.userId,
          pointId: dailyStancesTable.pointId,
          z: dailyStancesTable.zValue,
        })
        .from(dailyStancesTable)
        .where(
          and(
            eq(dailyStancesTable.snapDay, today),
            inArray(dailyStancesTable.userId, [userAId, userBId]),
            inArray(dailyStancesTable.pointId, pointIds)
          )
        );

      // rebuild maps & vectors
      mapA = {};
      mapB = {};
      aVec.length = 0;
      bVec.length = 0;
      for (const row of stancesRows) {
        if (row.userId === userAId) mapA[row.pointId] = row.z;
        else if (row.userId === userBId) mapB[row.pointId] = row.z;
      }
      for (const pid of pointIds) {
        aVec.push(mapA[pid] ?? 0);
        bVec.push(mapB[pid] ?? 0);
      }

      const nzA2 = aVec.filter((v) => v !== 0).length;
      const nzB2 = bVec.filter((v) => v !== 0).length;
      console.log(
        `[computeDelta] after rebuild non-zero counts -> A: ${nzA2}, B: ${nzB2}`
      );

      if (nzA2 === 0 && nzB2 === 0) {
        console.log("[computeDelta] Still zero after rebuild");
        return { delta: null, noInteraction: true };
      }
    } else {
      console.log("[computeDelta] No endorsements found for rebuild");
      return { delta: null, noInteraction: true };
    }
  }

  const delta = deltaFn(aVec, bVec);
  console.log("[computeDelta] returning delta", delta);
  return { delta, noInteraction: false };
}
