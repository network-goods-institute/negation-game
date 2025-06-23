import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { computeTopicDelta } from "@/actions/analytics/deltaAggregation";
import { db } from "@/services/db";
import {
  snapshotsTable,
  usersTable,
  viewpointsTable,
  pointClustersTable,
  endorsementsTable,
} from "@/db/schema";
import { eq, and, sql, inArray, ne } from "drizzle-orm";
import { buildPointCluster } from "@/actions/points/buildPointCluster";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { referenceUserId, topicId, snapDay, limit = 20 } = body;

    if (!referenceUserId || !topicId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const snapDayDate = snapDay ? new Date(snapDay) : new Date();
    snapDayDate.setHours(0, 0, 0, 0);

    const rationales = await db
      .select({
        id: viewpointsTable.id,
        graph: viewpointsTable.graph,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.topicId, topicId));

    if (rationales.length === 0) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        message: "No rationales found for this topic",
      });
    }

    const allPointIds: number[] = [];
    for (const rationale of rationales) {
      const graph = rationale.graph as any;
      if (graph?.nodes) {
        for (const node of graph.nodes) {
          if (node.type === "point" && node.data?.pointId) {
            const pointId = Number(node.data.pointId);
            if (!isNaN(pointId)) {
              allPointIds.push(pointId);
            }
          }
        }
      }
    }

    const uniquePointIds = [...new Set(allPointIds)];

    if (uniquePointIds.length === 0) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        message: "No valid points found in topic rationales",
      });
    }

    const rootPoints = await db
      .select({
        rootId: pointClustersTable.rootId,
        pointId: pointClustersTable.pointId,
      })
      .from(pointClustersTable)
      .where(inArray(pointClustersTable.pointId, uniquePointIds));

    let uniqueRootIds = [...new Set(rootPoints.map((rp) => rp.rootId))];

    if (uniqueRootIds.length === 0) {
      for (const pid of uniquePointIds) {
        await buildPointCluster(pid);
      }

      const refreshedRoots = await db
        .select({ rootId: pointClustersTable.rootId })
        .from(pointClustersTable)
        .where(inArray(pointClustersTable.pointId, uniquePointIds));

      uniqueRootIds = [...new Set(refreshedRoots.map((r) => r.rootId))];

      if (uniqueRootIds.length === 0) {
        return NextResponse.json({
          mostSimilar: [],
          mostDifferent: [],
          totalUsers: 0,
          message: "Could not build point clusters for topic points",
        });
      }
    }

    const clusterPointIds = await db
      .select({
        pointId: pointClustersTable.pointId,
      })
      .from(pointClustersTable)
      .where(inArray(pointClustersTable.rootId, uniqueRootIds));

    const allClusterPointIds = clusterPointIds.map((cp) => cp.pointId);

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
          inArray(snapshotsTable.pointId, allClusterPointIds),
          sql`${snapshotsTable.endorse} + ${snapshotsTable.restakeLive} + ${snapshotsTable.doubt} > 0`,
          ne(snapshotsTable.userId, referenceUserId)
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
            inArray(endorsementsTable.pointId, allClusterPointIds),
            sql`${endorsementsTable.cred} > 0`,
            ne(endorsementsTable.userId, referenceUserId)
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
        message: "No other users have engaged with this topic's point clusters",
      });
    }

    const deltaResults = await Promise.all(
      usersWithEngagement.map(async (user) => {
        try {
          const result = await computeTopicDelta({
            userAId: referenceUserId,
            userBId: user.userId,
            topicId: Number(topicId),
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
            `Error computing topic delta for user ${user.userId}:`,
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
        message: "No comparable users found for this topic",
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
      { error: "Failed to compute topic delta comparison" },
      { status: 500 }
    );
  }
}
