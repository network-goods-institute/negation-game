"use server";

import { db } from "@/services/db";
import {
  credEventsTable,
  snapshotsTable,
  pointClustersTable,
  viewpointsTable,
  rationalePointsTable,
} from "@/db/schema";
import { sql, and, gte, lt, eq } from "drizzle-orm";
import { buildPointCluster } from "@/actions/points/buildPointCluster";import { logger } from "@/lib/logger";

export async function dailySnapshotJob(
  snapDay: string = new Date().toISOString().slice(0, 10)
): Promise<{ success: boolean; message: string; stats?: any }> {
  logger.log(`[dailySnapshotJob] Starting snapshot for ${snapDay}`);

  try {
    const snapDayDate = new Date(snapDay);
    const nextDayDate = new Date(snapDay);
    nextDayDate.setDate(nextDayDate.getDate() + 1);

    // Get previous snapshot day to determine what events to aggregate
    const previousSnapResult = await db
      .select({ snapDay: snapshotsTable.snapDay })
      .from(snapshotsTable)
      .orderBy(sql`${snapshotsTable.snapDay} DESC`)
      .limit(1);

    const previousSnapDay =
      previousSnapResult[0]?.snapDay || new Date("2020-01-01");
    const previousSnapEndDate = new Date(previousSnapDay);
    previousSnapEndDate.setDate(previousSnapEndDate.getDate() + 1);

    logger.log(
      `[dailySnapshotJob] Aggregating events from ${previousSnapEndDate.toISOString()} to ${nextDayDate.toISOString()}`
    );

    // Aggregate cred events since previous snapshot
    // Group by user_id, point_id and sum amounts by kind
    const eventAggregates = await db
      .select({
        userId: credEventsTable.userId,
        pointId: credEventsTable.pointId,
        endorse:
          sql<number>`COALESCE(SUM(CASE WHEN ${credEventsTable.kind} = 'ENDORSE' THEN ${credEventsTable.amount} ELSE 0 END), 0)`.mapWith(
            Number
          ),
        restake:
          sql<number>`COALESCE(SUM(CASE WHEN ${credEventsTable.kind} = 'RESTAKE' THEN ${credEventsTable.amount} ELSE 0 END), 0)`.mapWith(
            Number
          ),
        slash:
          sql<number>`COALESCE(SUM(CASE WHEN ${credEventsTable.kind} = 'SLASH' THEN ${credEventsTable.amount} ELSE 0 END), 0)`.mapWith(
            Number
          ),
        doubt:
          sql<number>`COALESCE(SUM(CASE WHEN ${credEventsTable.kind} = 'DOUBT' THEN ${credEventsTable.amount} ELSE 0 END), 0)`.mapWith(
            Number
          ),
      })
      .from(credEventsTable)
      .where(
        and(
          gte(credEventsTable.ts, previousSnapEndDate),
          lt(credEventsTable.ts, nextDayDate)
        )
      )
      .groupBy(credEventsTable.userId, credEventsTable.pointId);

    logger.log(
      `[dailySnapshotJob] Found ${eventAggregates.length} user-point combinations with events`
    );

    // Fetch the latest snapshot DAY before the current one to get cumulative totals
    const prevDayResult = await db
      .select({ snapDay: snapshotsTable.snapDay })
      .from(snapshotsTable)
      .where(lt(snapshotsTable.snapDay, snapDayDate))
      .orderBy(sql`${snapshotsTable.snapDay} DESC`)
      .limit(1);

    const latestPrevDay = prevDayResult[0]?.snapDay ?? null;

    const prevSnapshots = latestPrevDay
      ? await db
          .select()
          .from(snapshotsTable)
          .where(eq(snapshotsTable.snapDay, latestPrevDay))
      : [];

    // We'll accumulate into this map first, keyed by userId-pointId
    const accumMap: Map<
      string,
      {
        snapDay: Date;
        userId: string;
        pointId: number;
        endorse: number;
        restakeLive: number;
        doubt: number;
        sign: number;
        bucketId: number | null;
      }
    > = new Map();

    // Start with previous snapshot totals (carry-over for users/points with no new events)
    for (const prev of prevSnapshots) {
      accumMap.set(`${prev.userId}-${prev.pointId}`, {
        snapDay: snapDayDate,
        userId: prev.userId,
        pointId: prev.pointId,
        endorse: prev.endorse,
        restakeLive: prev.restakeLive,
        doubt: prev.doubt,
        sign: prev.sign,
        bucketId: prev.bucketId,
      });
    }

    const pointToTopicMap = new Map<number, number | null>();

    try {
      const pointTopicMappings = await db
        .select({
          pointId: rationalePointsTable.pointId,
          topicId: viewpointsTable.topicId,
        })
        .from(rationalePointsTable)
        .leftJoin(
          viewpointsTable,
          eq(rationalePointsTable.rationaleId, viewpointsTable.id)
        )
        .where(sql`${viewpointsTable.topicId} IS NOT NULL`);

      for (const mapping of pointTopicMappings) {
        pointToTopicMap.set(mapping.pointId, mapping.topicId);
      }
    } catch (error) {
      logger.warn(
        "[dailySnapshotJob] Could not fetch point-topic mappings, using fallback approach:",
        error instanceof Error ? error.message : String(error)
      );
      // Fallback: extract point-topic mappings from viewpoint graphs
      const viewpoints = await db
        .select({
          id: viewpointsTable.id,
          graph: viewpointsTable.graph,
          topicId: viewpointsTable.topicId,
        })
        .from(viewpointsTable)
        .where(sql`${viewpointsTable.topicId} IS NOT NULL`);

      for (const viewpoint of viewpoints) {
        if (viewpoint.graph && viewpoint.topicId) {
          const graph = viewpoint.graph as any;
          if (graph?.nodes) {
            for (const node of graph.nodes) {
              if (node.type === "point" && node.data?.pointId) {
                const pointId = Number(node.data.pointId);
                if (!isNaN(pointId)) {
                  pointToTopicMap.set(pointId, viewpoint.topicId);
                }
              }
            }
          }
        }
      }
    }

    // Process today's event deltas, adding to carry-over totals
    for (const agg of eventAggregates) {
      const key = `${agg.userId}-${agg.pointId}`;
      const carry = accumMap.get(key);

      // Calculate live restake delta (restake - slash)
      const restakeLiveDelta = Math.max(0, agg.restake - agg.slash);

      const prevEndorse = carry?.endorse ?? 0;
      const prevRestakeLive = carry?.restakeLive ?? 0;
      const prevDoubt = carry?.doubt ?? 0;

      const newEndorse = prevEndorse + agg.endorse;
      const newRestakeLiveRaw = prevRestakeLive + restakeLiveDelta;
      const newDoubt = prevDoubt + agg.doubt;

      // Enforce restake cap: R ≤ E
      const cappedRestakeLive = Math.min(newRestakeLiveRaw, newEndorse);

      // Ensure cluster sign exists – build on demand if missing
      let signValue = carry?.sign;
      if (signValue === undefined) {
        const clusterInfo = await db
          .select({ sign: pointClustersTable.sign })
          .from(pointClustersTable)
          .where(eq(pointClustersTable.pointId, agg.pointId))
          .limit(1);

        if (!clusterInfo.length) {
          // Build and re-query
          await buildPointCluster(agg.pointId);
          const refreshed = await db
            .select({ sign: pointClustersTable.sign })
            .from(pointClustersTable)
            .where(eq(pointClustersTable.pointId, agg.pointId))
            .limit(1);
          signValue = refreshed[0]?.sign || 1;
        } else {
          signValue = clusterInfo[0].sign || 1;
        }
      }

      const bucketId =
        pointToTopicMap.get(agg.pointId) ?? carry?.bucketId ?? null;

      accumMap.set(key, {
        snapDay: snapDayDate,
        userId: agg.userId,
        pointId: agg.pointId,
        endorse: newEndorse,
        restakeLive: cappedRestakeLive,
        doubt: newDoubt,
        sign: signValue ?? 1,
        bucketId,
      });
    }

    // Convert accumMap to array
    const snapshotRows = Array.from(accumMap.values());

    // Insert/update snapshots with transaction boundary
    if (snapshotRows.length > 0) {
      await db.transaction(async (tx) => {
        await tx
          .insert(snapshotsTable)
          .values(snapshotRows)
          .onConflictDoUpdate({
            target: [
              snapshotsTable.snapDay,
              snapshotsTable.userId,
              snapshotsTable.pointId,
            ],
            set: {
              endorse: sql`EXCLUDED.endorse`,
              restakeLive: sql`EXCLUDED.restake_live`,
              doubt: sql`EXCLUDED.doubt`,
              sign: sql`EXCLUDED.sign`,
              bucketId: sql`EXCLUDED.bucket_id`,
            },
          });
      });
    }

    logger.log(
      `[dailySnapshotJob] Inserted/updated ${snapshotRows.length} snapshot rows`
    );

    return {
      success: true,
      message: `Daily snapshot completed for ${snapDay}`,
      stats: {
        eventAggregates: eventAggregates.length,
        snapshotRows: snapshotRows.length,
        previousSnapDay: previousSnapDay.toISOString().slice(0, 10),
        pointToTopicMappings: pointToTopicMap.size,
      },
    };
  } catch (error) {
    logger.error("[dailySnapshotJob] Error:", error);
    return {
      success: false,
      message: `Daily snapshot failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
