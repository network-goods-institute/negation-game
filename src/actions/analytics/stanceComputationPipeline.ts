"use server";

import { db } from "@/services/db";
import { snapshotsTable, dailyStancesTable, usersTable } from "@/db/schema";
import { sql, eq, and, inArray } from "drizzle-orm";
import {
  stance,
  toZScores,
  BucketedStance,
} from "@/lib/negation-game/deltaScore";import { logger } from "@/lib/logger";

export async function stanceComputationPipeline(
  snapDay: string = new Date().toISOString().slice(0, 10)
): Promise<{ success: boolean; message: string; stats?: any }> {
  logger.log(
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
      logger.log(
        `[stanceComputationPipeline] No snapshots found for ${snapDay}`
      );
      return {
        success: true,
        message: `No snapshots to process for ${snapDay}`,
        stats: { snapshots: 0, stances: 0 },
      };
    }

    logger.log(
      `[stanceComputationPipeline] Processing ${snapshots.length} snapshots`
    );

    // Compute total cred per user for normalization across ALL user points (not just snapshot subset)
    const userTotalCredMap = new Map<string, number>();

    const uniqueUserIds = Array.from(new Set(snapshots.map((s) => s.userId)));

    // Calculate total cred per user across ALL their points on this day
    if (uniqueUserIds.length > 0) {
      const userTotalCredRows = await db
        .select({
          userId: snapshotsTable.userId,
          totalCred:
            sql<number>`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive})`.mapWith(
              Number
            ),
        })
        .from(snapshotsTable)
        .where(
          and(
            eq(snapshotsTable.snapDay, snapDayDate),
            inArray(snapshotsTable.userId, uniqueUserIds)
          )
        )
        .groupBy(snapshotsTable.userId);

      for (const row of userTotalCredRows) {
        userTotalCredMap.set(row.userId, row.totalCred || 1); // Avoid division by zero
      }
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

      // Map z-scores back to their corresponding user-point pairs with proper indexing
      const bucketRawStances = rawStances.filter(
        (rs) => (rs.bucketId?.toString() || "__UNTAGGED__") === bucketKey
      );

      // Ensure we have matching counts to prevent index misalignment
      if (bucketRawStances.length !== zScores.length) {
        logger.error(
          `[stanceComputationPipeline] Index mismatch in bucket ${bucketKey}: ` +
            `${bucketRawStances.length} raw stances vs ${zScores.length} z-scores`
        );
        continue;
      }

      for (let i = 0; i < bucketRawStances.length; i++) {
        const rawStance = bucketRawStances[i];
        finalStances.push({
          snapDay: snapDayDate,
          userId: rawStance.userId,
          pointId: rawStance.pointId,
          zValue: zScores[i],
        });
      }
    }

    // Insert z-values into daily_stances table with transaction boundary
    if (finalStances.length > 0) {
      await db.transaction(async (tx) => {
        await tx
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
      });
    }

    logger.log(
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
    logger.error("[stanceComputationPipeline] Error:", error);
    return {
      success: false,
      message: `Stance computation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
