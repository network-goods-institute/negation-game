"use server";

import { db } from "@/services/db";
import {
  credEventsTable,
  pointsTable,
  negationsTable,
  notificationsTable,
  viewpointsTable,
} from "@/db/schema";
import { sql, gte, eq, and, lt } from "drizzle-orm";
import { computeDaoAlignment } from "@/actions/analytics/computeDaoAlignment";
import { computeContestedPoints } from "@/actions/analytics/computeContestedPoints";

export interface DaoStats {
  // Activity Overview
  activeUsers: number;
  dailyActivity: number;
  contentCreation: number;
  newPoints: number;
  newRationales: number;
  credFlow: number;
  userGrowth?: number;
  activityTrend?: number;
  currentMonth: string;

  // Engagement Health
  dialecticalEngagement: number;
  daoAlignment: number;
  contestedPoints: number;
  responseRate: number;

  // Participation Distribution
  activityConcentration: number;
  newContributorRatio: number;
  crossSpaceUsers: number;
}

export async function fetchDaoStats(space: string): Promise<DaoStats> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonth = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Keep 30-day windows for some metrics that work better with rolling windows
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  // Activity Metrics - expanded to 30 days for more comprehensive data
  const [activityMetrics] = await db
    .select({
      activeUsers:
        sql<number>`COUNT(DISTINCT ${credEventsTable.userId})`.mapWith(Number),
      totalTransactions: sql<number>`COUNT(*)`.mapWith(Number),
      credFlow:
        sql<number>`COALESCE(SUM(ABS(${credEventsTable.amount})), 0)`.mapWith(
          Number
        ),
    })
    .from(credEventsTable)
    .where(
      space === "global"
        ? gte(credEventsTable.ts, currentMonthStart)
        : and(
            gte(credEventsTable.ts, currentMonthStart),
            sql`EXISTS (
            SELECT 1 FROM ${pointsTable} p 
            WHERE p.id = ${credEventsTable.pointId} 
            AND p.space = ${space}
          )`
          )
    );

  // Previous period for comparison (30-60 days ago)
  const [previousActivityMetrics] = await db
    .select({
      activeUsers:
        sql<number>`COUNT(DISTINCT ${credEventsTable.userId})`.mapWith(Number),
      totalTransactions: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(credEventsTable)
    .where(
      space === "global"
        ? and(
            gte(credEventsTable.ts, sixtyDaysAgo),
            lt(credEventsTable.ts, thirtyDaysAgo)
          )
        : and(
            gte(credEventsTable.ts, sixtyDaysAgo),
            lt(credEventsTable.ts, thirtyDaysAgo),
            sql`EXISTS (
            SELECT 1 FROM ${pointsTable} p 
            WHERE p.id = ${credEventsTable.pointId} 
            AND p.space = ${space}
          )`
          )
    );

  // Content Creation - current month
  const [contentMetrics] = await db
    .select({
      newPoints: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(pointsTable)
    .where(
      space === "global"
        ? gte(pointsTable.createdAt, currentMonthStart)
        : and(
            gte(pointsTable.createdAt, currentMonthStart),
            eq(pointsTable.space, space)
          )
    );

  const [rationaleMetrics] = await db
    .select({
      newRationales: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(viewpointsTable)
    .where(
      space === "global"
        ? gte(viewpointsTable.createdAt, currentMonthStart)
        : and(
            gte(viewpointsTable.createdAt, currentMonthStart),
            eq(viewpointsTable.space, space)
          )
    );

  // Dialectical Engagement (avg negations per point)
  const [dialecticalMetrics] = await db
    .select({
      avgNegations: sql<number>`COALESCE(AVG(negation_count), 0)`.mapWith(
        Number
      ),
    })
    .from(
      sql`(
      SELECT ${pointsTable.id}, COUNT(${negationsTable.olderPointId}) as negation_count
      FROM ${pointsTable}
      LEFT JOIN ${negationsTable} ON ${pointsTable.id} = ${negationsTable.olderPointId}
      WHERE ${space === "global" ? sql`TRUE` : sql`${pointsTable.space} = ${space}`}
      AND ${negationsTable.isActive} = true
      GROUP BY ${pointsTable.id}
    ) subq`
    );

  // DAO Alignment and Contested Points (reuse existing functions)
  const daoAlignment = await computeDaoAlignment({ space }).catch((error) => {
    console.error("[fetchDaoStats] DAO alignment error:", error);
    return { delta: null, userCount: 0, pairCount: 0 };
  });

  const contestedPoints = await computeContestedPoints({
    snapDay: new Date().toISOString().slice(0, 10),
    space,
    limit: 50,
  }).catch((error) => {
    console.error("[fetchDaoStats] Contested points error:", error);
    return [];
  });

  // Response Rate (notifications that led to actions) - SPACE FILTERED
  const [responseMetrics] = await db
    .select({
      totalNotifications: sql<number>`COUNT(*)`,
      respondedNotifications: sql<number>`COUNT(CASE WHEN ${notificationsTable.readAt} IS NOT NULL THEN 1 END)`,
    })
    .from(notificationsTable)
    .where(
      space === "global"
        ? gte(notificationsTable.createdAt, thirtyDaysAgo)
        : and(
            gte(notificationsTable.createdAt, thirtyDaysAgo),
            eq(notificationsTable.space, space)
          )
    );

  // Activity Distribution - expanded to 90 days for comprehensive historical data
  const userActivityDistribution = await db
    .select({
      userId: credEventsTable.userId,
      activityCount: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(credEventsTable)
    .where(
      space === "global"
        ? gte(credEventsTable.ts, ninetyDaysAgo)
        : and(
            gte(credEventsTable.ts, ninetyDaysAgo),
            sql`EXISTS (
            SELECT 1 FROM ${pointsTable} p 
            WHERE p.id = ${credEventsTable.pointId} 
            AND p.space = ${space}
          )`
          )
    )
    .groupBy(credEventsTable.userId);

  // New vs Returning Contributors - expanded to 90 days
  const [contributorMetrics] = await db
    .select({
      totalContributors:
        sql<number>`COUNT(DISTINCT ${credEventsTable.userId})`.mapWith(Number),
      newContributors: sql<number>`COUNT(DISTINCT CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM ${credEventsTable} ce2 
        WHERE ce2.user_id = ${credEventsTable.userId} 
        AND ce2.ts < ${thirtyDaysAgoIso}
      ) THEN ${credEventsTable.userId} 
    END)`.mapWith(Number),
    })
    .from(credEventsTable)
    .where(
      space === "global"
        ? gte(credEventsTable.ts, ninetyDaysAgo)
        : and(
            gte(credEventsTable.ts, ninetyDaysAgo),
            sql`EXISTS (
            SELECT 1 FROM ${pointsTable} p 
            WHERE p.id = ${credEventsTable.pointId} 
            AND p.space = ${space}
          )`
          )
    );

  // Cross-Space Users (only relevant for specific spaces)
  let crossSpaceUsers = 0;
  if (space !== "global") {
    const [crossSpaceMetrics] = await db
      .select({
        crossSpaceUsers: sql<number>`COUNT(DISTINCT ce1.user_id)`,
      })
      .from(sql`${credEventsTable} ce1`)
      .where(
        and(
          gte(sql`ce1.ts`, thirtyDaysAgoIso),
          sql`EXISTS (
          SELECT 1 FROM ${credEventsTable} ce2
          JOIN ${pointsTable} p1 ON ce2.point_id = p1.id
          JOIN ${pointsTable} p2 ON ce1.point_id = p2.id
          WHERE ce2.user_id = ce1.user_id
          AND p1.space = ${space}
          AND p2.space != ${space}
          AND ce2.ts >= ${thirtyDaysAgoIso}
        )`
        )
      );
    crossSpaceUsers = crossSpaceMetrics?.crossSpaceUsers || 0;
  }

  // Calculate derived metrics
  const dailyActivity = Math.round(
    (activityMetrics?.totalTransactions || 0) / 30
  );
  const contentCreation = Math.round(
    ((contentMetrics?.newPoints || 0) +
      (rationaleMetrics?.newRationales || 0)) /
      30
  );

  const userGrowth =
    previousActivityMetrics?.activeUsers &&
    previousActivityMetrics.activeUsers > 0
      ? Math.round(
          (((activityMetrics?.activeUsers || 0) -
            previousActivityMetrics.activeUsers) /
            previousActivityMetrics.activeUsers) *
            100
        )
      : undefined;

  const activityTrend =
    previousActivityMetrics?.totalTransactions &&
    previousActivityMetrics.totalTransactions > 0
      ? Math.round(
          (((activityMetrics?.totalTransactions || 0) -
            previousActivityMetrics.totalTransactions) /
            previousActivityMetrics.totalTransactions) *
            100
        )
      : undefined;

  const responseRate =
    responseMetrics?.totalNotifications &&
    responseMetrics.totalNotifications > 0
      ? (responseMetrics.respondedNotifications || 0) /
        responseMetrics.totalNotifications
      : 0;

  // Simple Gini coefficient approximation
  const activityCounts = userActivityDistribution
    .map((u: any) => u.activityCount)
    .sort((a: number, b: number) => a - b);
  const n = activityCounts.length;
  const totalActivity = activityCounts.reduce(
    (sum: number, count: number) => sum + count,
    0
  );

  let activityConcentration = 0;
  if (n > 1 && totalActivity > 0) {
    // Correct Gini coefficient formula
    let giniSum = 0;
    for (let i = 0; i < n; i++) {
      // Use 1-based rank for proper Gini calculation
      giniSum += (i + 1) * activityCounts[i];
    }

    // Standard Gini: G = (2 * Σ(rank * value) - (n + 1) * Σ(value)) / (n * Σ(value))
    const numerator = 2 * giniSum - (n + 1) * totalActivity;
    const denominator = n * totalActivity;
    const gini = numerator / denominator;

    // Convert to percentage (0 = perfectly equal, 100 = maximally concentrated)
    activityConcentration = Math.min(100, Math.max(0, gini * 100));
  }

  const newContributorRatio =
    contributorMetrics?.totalContributors &&
    contributorMetrics.totalContributors > 0
      ? (contributorMetrics.newContributors || 0) /
        contributorMetrics.totalContributors
      : 0;

  return {
    // Activity Overview
    activeUsers: activityMetrics?.activeUsers || 0,
    dailyActivity,
    contentCreation,
    newPoints: contentMetrics?.newPoints || 0,
    newRationales: rationaleMetrics?.newRationales || 0,
    credFlow: activityMetrics?.credFlow || 0,
    userGrowth,
    activityTrend,
    currentMonth,

    // Engagement Health
    dialecticalEngagement: dialecticalMetrics?.avgNegations || 0,
    daoAlignment: daoAlignment.delta ?? 0.5,
    contestedPoints: contestedPoints.length,
    responseRate,

    // Participation Distribution
    activityConcentration: Math.min(100, Math.max(0, activityConcentration)),
    newContributorRatio,
    crossSpaceUsers,
  };
}
