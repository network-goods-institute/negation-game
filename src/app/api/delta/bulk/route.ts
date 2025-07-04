import { NextRequest, NextResponse } from "next/server";
import { computeDelta } from "@/actions/analytics/computeDelta";
import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import {
  snapshotsTable,
  usersTable,
  pointClustersTable,
  endorsementsTable,
} from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { buildPointCluster } from "@/actions/points/buildPointCluster";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { referenceUserId, rootPointId, snapDay, limit = 20 } = body;

    if (!referenceUserId || !rootPointId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const snapDayDate = snapDay ? new Date(snapDay) : new Date();
    snapDayDate.setHours(0, 0, 0, 0);

    // First, get the point cluster for this root point
    let cluster = await db
      .select({
        pointId: pointClustersTable.pointId,
      })
      .from(pointClustersTable)
      .where(eq(pointClustersTable.rootId, rootPointId));

    if (cluster.length === 0) {
      console.log(
        `[/api/delta/bulk] Building cluster for root point ${rootPointId}`
      );
      // Try to build cluster on demand
      await buildPointCluster(rootPointId);
      cluster = await db
        .select({
          pointId: pointClustersTable.pointId,
        })
        .from(pointClustersTable)
        .where(eq(pointClustersTable.rootId, rootPointId));

      if (cluster.length === 0) {
        return NextResponse.json({
          mostSimilar: [],
          mostDifferent: [],
          totalUsers: 0,
          message: "Could not find or build point cluster",
        });
      }
    }

    const pointIds = cluster.map((c) => c.pointId);
    console.log(
      `[/api/delta/bulk] Found cluster with ${pointIds.length} points: ${pointIds.join(", ")}`
    );

    // Try to get users from snapshots first
    let usersWithEngagement = await db
      .select({
        userId: snapshotsTable.userId,
        username: usersTable.username,
        totalEngagement:
          sql<number>`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt})`.mapWith(
            Number
          ),
      })
      .from(snapshotsTable)
      .leftJoin(usersTable, eq(snapshotsTable.userId, usersTable.id))
      .where(
        and(
          eq(snapshotsTable.snapDay, snapDayDate),
          inArray(snapshotsTable.pointId, pointIds),
          sql`${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt} > 0`
        )
      )
      .groupBy(snapshotsTable.userId, usersTable.username)
      .having(
        sql`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt}) > 0`
      )
      .orderBy(
        sql`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt}) DESC`
      )
      .limit(Math.min(limit * 2, 100)); // Get more users than requested to account for null deltas

    console.log(
      `[/api/delta/bulk] Found ${usersWithEngagement.length} users in snapshots`
    );

    // If no users found in snapshots, fallback to live endorsement data
    if (usersWithEngagement.length === 0) {
      console.log(
        "[/api/delta/bulk] No snapshot data, falling back to live endorsements"
      );

      usersWithEngagement = await db
        .select({
          userId: endorsementsTable.userId,
          username: usersTable.username,
          totalEngagement: sql<number>`SUM(${endorsementsTable.cred})`.mapWith(
            Number
          ),
        })
        .from(endorsementsTable)
        .leftJoin(usersTable, eq(endorsementsTable.userId, usersTable.id))
        .where(
          and(
            inArray(endorsementsTable.pointId, pointIds),
            sql`${endorsementsTable.cred} > 0`
          )
        )
        .groupBy(endorsementsTable.userId, usersTable.username)
        .having(sql`SUM(${endorsementsTable.cred}) > 0`)
        .orderBy(sql`SUM(${endorsementsTable.cred}) DESC`)
        .limit(Math.min(limit * 2, 100));

      console.log(
        `[/api/delta/bulk] Found ${usersWithEngagement.length} users in live endorsements`
      );
    }

    if (usersWithEngagement.length === 0) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        message: "No users have engaged with this point cluster yet",
      });
    }

    // Filter out the reference user
    const otherUsers = usersWithEngagement.filter(
      (u) => u.userId !== referenceUserId
    );

    // Compute deltas for all other users
    const deltaResults = await Promise.all(
      otherUsers.map(async (user) => {
        try {
          const result = await computeDelta({
            userAId: referenceUserId,
            userBId: user.userId,
            rootPointId: Number(rootPointId),
            snapDay: snapDay || new Date().toISOString().slice(0, 10),
          });

          return {
            userId: user.userId,
            username: user.username || "Unknown",
            delta: result.delta,
            noInteraction: result.noInteraction,
            totalEngagement: user.totalEngagement,
          };
        } catch (error) {
          console.error(
            `Error computing delta for user ${user.userId}:`,
            error
          );
          return {
            userId: user.userId,
            username: user.username || "Unknown",
            delta: null,
            noInteraction: true,
            totalEngagement: user.totalEngagement,
          };
        }
      })
    );

    // Filter out null deltas and sort
    const validDeltas = deltaResults.filter(
      (r) => r.delta !== null && !r.noInteraction
    );

    if (validDeltas.length === 0) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: otherUsers.length,
        message: "No comparable users found for this point cluster",
      });
    }

    // Sort by delta (ascending for most similar, descending for most different)
    const sortedByDelta = [...validDeltas].sort(
      (a, b) => (a.delta || 0) - (b.delta || 0)
    );

    const requestedLimit = Math.min(limit, validDeltas.length);

    // Get most similar users (lowest delta scores)
    const mostSimilar = sortedByDelta.slice(0, requestedLimit);

    // Get most different users (highest delta scores)
    // Ensure no overlap by excluding users already in mostSimilar
    const mostSimilarUserIds = new Set(mostSimilar.map((u) => u.userId));
    const remainingUsers = sortedByDelta.filter(
      (u) => !mostSimilarUserIds.has(u.userId)
    );

    // Sort remaining users by delta descending (highest first) and take the top ones
    const mostDifferent = remainingUsers
      .sort((a, b) => (b.delta || 0) - (a.delta || 0))
      .slice(0, Math.min(requestedLimit, remainingUsers.length));

    return NextResponse.json({
      mostSimilar,
      mostDifferent,
      totalUsers: validDeltas.length,
      totalEngaged: usersWithEngagement.length,
    });
  } catch (error) {
    console.error("[/api/delta/bulk] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute bulk deltas" },
      { status: 500 }
    );
  }
}
