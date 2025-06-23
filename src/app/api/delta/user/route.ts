import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import {
  snapshotsTable,
  usersTable,
  pointsTable,
  pointClustersTable,
  endorsementsTable,
} from "@/db/schema";
import { eq, and, sql, inArray, ne } from "drizzle-orm";
import { computeDelta } from "@/actions/analytics/computeDelta";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { referenceUserId, targetUserId, snapDay, limit = 20 } = body;

    if (!referenceUserId || !targetUserId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const snapDayDate = snapDay ? new Date(snapDay) : new Date();
    snapDayDate.setHours(0, 0, 0, 0);

    const targetUserPoints = await db
      .select({
        pointId: pointsTable.id,
      })
      .from(pointsTable)
      .where(eq(pointsTable.createdBy, targetUserId));

    if (targetUserPoints.length === 0) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        message: "Target user has not created any points yet",
      });
    }

    const pointIds = targetUserPoints.map((p) => p.pointId);

    const rootPoints = await db
      .select({
        rootId: pointClustersTable.rootId,
      })
      .from(pointClustersTable)
      .where(inArray(pointClustersTable.pointId, pointIds));

    const uniqueRootIds = [...new Set(rootPoints.map((rp) => rp.rootId))];

    if (uniqueRootIds.length === 0) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        message: "No point clusters found for target user's points",
      });
    }

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
      .leftJoin(
        pointClustersTable,
        eq(snapshotsTable.pointId, pointClustersTable.pointId)
      )
      .where(
        and(
          eq(snapshotsTable.snapDay, snapDayDate),
          inArray(pointClustersTable.rootId, uniqueRootIds),
          sql`${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt} > 0`,
          ne(snapshotsTable.userId, referenceUserId),
          ne(snapshotsTable.userId, targetUserId)
        )
      )
      .groupBy(snapshotsTable.userId, usersTable.username)
      .having(
        sql`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt}) > 0`
      )
      .orderBy(
        sql`SUM(${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt}) DESC`
      )
      .limit(Math.min(limit * 2, 100));

    if (usersWithEngagement.length === 0) {
      const clusterPointIds = await db
        .select({
          pointId: pointClustersTable.pointId,
        })
        .from(pointClustersTable)
        .where(inArray(pointClustersTable.rootId, uniqueRootIds));

      const allPointIds = clusterPointIds.map((cp) => cp.pointId);

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
            inArray(endorsementsTable.pointId, allPointIds),
            sql`${endorsementsTable.cred} > 0`,
            ne(endorsementsTable.userId, referenceUserId),
            ne(endorsementsTable.userId, targetUserId)
          )
        )
        .groupBy(endorsementsTable.userId, usersTable.username)
        .having(sql`SUM(${endorsementsTable.cred}) > 0`)
        .orderBy(sql`SUM(${endorsementsTable.cred}) DESC`)
        .limit(Math.min(limit * 2, 100));
    }

    if (usersWithEngagement.length === 0) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        message:
          "No other users have engaged with the target user's point clusters",
      });
    }

    const deltaResults = await Promise.all(
      usersWithEngagement.map(async (user) => {
        try {
          const clusterDeltas = await Promise.all(
            uniqueRootIds.map(async (rootId) => {
              const result = await computeDelta({
                userAId: referenceUserId,
                userBId: user.userId,
                rootPointId: rootId,
                snapDay: snapDay || new Date().toISOString().slice(0, 10),
              });
              return result.delta;
            })
          );

          const validDeltas = clusterDeltas.filter(
            (d): d is number => d !== null
          );
          const avgDelta =
            validDeltas.length > 0
              ? validDeltas.reduce((sum, d) => sum + d, 0) / validDeltas.length
              : null;

          return {
            userId: user.userId,
            username: user.username || "Unknown",
            delta: avgDelta,
            noInteraction: avgDelta === null,
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

    const validDeltas = deltaResults.filter(
      (r) => r.delta !== null && !r.noInteraction
    );

    if (validDeltas.length === 0) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: usersWithEngagement.length,
        message: "No comparable users found for the target user's points",
      });
    }

    const sortedByDelta = [...validDeltas].sort(
      (a, b) => (a.delta || 0) - (b.delta || 0)
    );

    const requestedLimit = Math.min(limit, validDeltas.length);

    const mostSimilar = sortedByDelta.slice(0, requestedLimit);

    const mostSimilarUserIds = new Set(mostSimilar.map((u) => u.userId));
    const remainingUsers = sortedByDelta.filter(
      (u) => !mostSimilarUserIds.has(u.userId)
    );

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
    return NextResponse.json(
      { error: "Failed to compute user delta comparison" },
      { status: 500 }
    );
  }
}
