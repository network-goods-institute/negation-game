"use server";

import { db } from "@/services/db";
import { snapshotsTable, dailyStancesTable, usersTable } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";
import {
  stance,
  toZScores,
  BucketedStance,
} from "@/lib/negation-game/deltaScore";

export async function stanceComputationPipeline(
  snapDay: string = new Date().toISOString().slice(0, 10)
): Promise<{ success: boolean; message: string; stats?: any }> {
  console.log(
    `[stanceComputationPipeline] Starting stance computation for ${snapDay}`
  );

  try {
    const snapDayDate = new Date(snapDay);

    // Read snapshots for the day
    const snapshots = await db
      .select({
        userId: snapshotsTable.userId,
        pointId: snapshotsTable.pointId,
        endorse: snapshotsTable.endorse,
        restakeLive: snapshotsTable.restakeLive,
        doubt: snapshotsTable.doubt,
        sign: snapshotsTable.sign,
        bucketId: snapshotsTable.bucketId,
      })
      .from(snapshotsTable)
      .where(eq(snapshotsTable.snapDay, snapDayDate));

    if (snapshots.length === 0) {
      console.log(
        `[stanceComputationPipeline] No snapshots found for ${snapDay}`
      );
      return {
        success: true,
        message: `No snapshots to process for ${snapDay}`,
        stats: { snapshots: 0, stances: 0 },
      };
    }

    console.log(
      `[stanceComputationPipeline] Processing ${snapshots.length} snapshots`
    );

    // Compute total cred per user for normalization
    const userTotalCredMap = new Map<string, number>();

    // Group snapshots by user to calculate total cred
    const userSnapshots = new Map<string, typeof snapshots>();
    for (const snap of snapshots) {
      if (!userSnapshots.has(snap.userId)) {
        userSnapshots.set(snap.userId, []);
      }
      userSnapshots.get(snap.userId)!.push(snap);
    }

    // Calculate total cred per user (Tu = sum of endorse + live restake across all points)
    for (const [userId, userSnaps] of userSnapshots.entries()) {
      const totalCred = userSnaps.reduce((sum, snap) => {
        return sum + snap.endorse + snap.restakeLive;
      }, 0);
      userTotalCredMap.set(userId, totalCred);
    }

    // Apply stance formula to get raw stance values
    const rawStances: Array<{
      userId: string;
      pointId: number;
      rawStance: number;
      bucketId: number | null;
    }> = [];

    for (const snap of snapshots) {
      const totalCred = userTotalCredMap.get(snap.userId) || 1; // Avoid division by zero
      const sign = (snap.sign as 1 | -1) || 1;

      const rawStance = stance(
        snap.endorse,
        snap.restakeLive,
        snap.doubt,
        sign,
        totalCred
      );

      rawStances.push({
        userId: snap.userId,
        pointId: snap.pointId,
        rawStance,
        bucketId: snap.bucketId,
      });
    }

    // Group raw stances by bucket for z-score computation
    const bucketGroups = new Map<string, BucketedStance[]>();

    for (const stance of rawStances) {
      const bucketKey = stance.bucketId?.toString() || "__UNTAGGED__";
      if (!bucketGroups.has(bucketKey)) {
        bucketGroups.set(bucketKey, []);
      }
      bucketGroups.get(bucketKey)!.push({
        bucket: stance.bucketId,
        value: stance.rawStance,
      });
    }

    // Compute z-scores within each bucket and create final stance records
    const finalStances: Array<{
      snapDay: Date;
      userId: string;
      pointId: number;
      zValue: number;
    }> = [];

    for (const [bucketKey, bucketStances] of bucketGroups.entries()) {
      const zScores = toZScores(bucketStances);

      // Map z-scores back to their corresponding user-point pairs
      let stanceIndex = 0;
      for (const rawStance of rawStances) {
        const stanceBucketKey =
          rawStance.bucketId?.toString() || "__UNTAGGED__";
        if (stanceBucketKey === bucketKey) {
          finalStances.push({
            snapDay: snapDayDate,
            userId: rawStance.userId,
            pointId: rawStance.pointId,
            zValue: zScores[stanceIndex],
          });
          stanceIndex++;
        }
      }
    }

    // Insert z-values into daily_stances table
    if (finalStances.length > 0) {
      await db
        .insert(dailyStancesTable)
        .values(finalStances)
        .onConflictDoUpdate({
          target: [
            dailyStancesTable.snapDay,
            dailyStancesTable.userId,
            dailyStancesTable.pointId,
          ],
          set: {
            zValue: sql`EXCLUDED.z_value`,
          },
        });
    }

    console.log(
      `[stanceComputationPipeline] Inserted/updated ${finalStances.length} stance records`
    );

    // Calculate bucket statistics for reporting
    const bucketStats = new Map<
      string,
      { count: number; meanRaw: number; meanZ: number }
    >();
    for (const [bucketKey, bucketStances] of bucketGroups.entries()) {
      const count = bucketStances.length;
      const meanRaw =
        bucketStances.reduce((sum, s) => sum + s.value, 0) / count;

      const correspondingZScores = finalStances
        .filter((fs) => {
          const rawStance = rawStances.find(
            (rs) => rs.userId === fs.userId && rs.pointId === fs.pointId
          );
          const stanceBucketKey =
            rawStance?.bucketId?.toString() || "__UNTAGGED__";
          return stanceBucketKey === bucketKey;
        })
        .map((fs) => fs.zValue);

      const meanZ =
        correspondingZScores.reduce((sum, z) => sum + z, 0) /
        correspondingZScores.length;

      bucketStats.set(bucketKey, { count, meanRaw, meanZ });
    }

    return {
      success: true,
      message: `Stance computation completed for ${snapDay}`,
      stats: {
        snapshots: snapshots.length,
        stances: finalStances.length,
        users: userTotalCredMap.size,
        buckets: bucketGroups.size,
        bucketStats: Object.fromEntries(bucketStats),
      },
    };
  } catch (error) {
    console.error("[stanceComputationPipeline] Error:", error);
    return {
      success: false,
      message: `Stance computation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
