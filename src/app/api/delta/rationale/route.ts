import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/actions/users/getUserId";
import { computeRationaleDelta } from "@/actions/analytics/deltaAggregation";
import { db } from "@/services/db";
import {
  snapshotsTable,
  usersTable,
  viewpointsTable,
  pointClustersTable,
  endorsementsTable,
} from "@/db/schema";
import { eq, and, sql, inArray, ne } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { referenceUserId, rationaleId, snapDay, limit = 20 } = body;

    if (!referenceUserId || !rationaleId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const snapDayDate = snapDay ? new Date(snapDay) : new Date();
    snapDayDate.setHours(0, 0, 0, 0);

    const rationale = await db
      .select({
        id: viewpointsTable.id,
        graph: viewpointsTable.graph,
        topicId: viewpointsTable.topicId,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.id, rationaleId))
      .limit(1);

    if (!rationale.length) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        message: "Rationale not found",
      });
    }

    const graph = rationale[0].graph as any;
    if (!graph?.nodes) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        message: "Rationale has no point data",
      });
    }

    const pointIds: number[] = [];
    for (const node of graph.nodes) {
      if (node.type === "point" && node.data?.pointId) {
        const pointId = Number(node.data.pointId);
        if (!isNaN(pointId)) {
          pointIds.push(pointId);
        }
      }
    }

    if (pointIds.length === 0) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        message: "No valid points found in rationale",
      });
    }

    const rootPoints = await db
      .select({
        rootId: pointClustersTable.rootId,
        pointId: pointClustersTable.pointId,
      })
      .from(pointClustersTable)
      .where(inArray(pointClustersTable.pointId, pointIds));

    const uniqueRootIds = [...new Set(rootPoints.map((rp) => rp.rootId))];

    if (uniqueRootIds.length === 0) {
      return NextResponse.json({
        mostSimilar: [],
        mostDifferent: [],
        totalUsers: 0,
        message: "No point clusters found for rationale points",
      });
    }

    const clusterPointIds = await db
      .select({
        pointId: pointClustersTable.pointId,
      })
      .from(pointClustersTable)
      .where(inArray(pointClustersTable.rootId, uniqueRootIds));

    const allPointIds = clusterPointIds.map((cp) => cp.pointId);

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
          inArray(snapshotsTable.pointId, allPointIds),
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
            inArray(endorsementsTable.pointId, allPointIds),
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
        message:
          "No other users have engaged with this rationale's point clusters",
      });
    }

    const deltaResults = await Promise.all(
      usersWithEngagement.map(async (user) => {
        try {
          const result = await computeRationaleDelta({
            userAId: referenceUserId,
            userBId: user.userId,
            rationaleId: rationaleId,
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
        message: "No comparable users found for this rationale",
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
      { error: "Failed to compute rationale delta comparison" },
      { status: 500 }
    );
  }
}
