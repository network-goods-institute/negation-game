"use server";

import { db } from "@/services/db";
import {
  credEventsTable,
  pointsTable,
  negationsTable,
  notificationsTable,
  viewpointsTable,
  endorsementsTable,
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
}

export async function fetchDaoStats(space: string): Promise<DaoStats> {
  const now = new Date();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();
  const ninetyDaysAgoIso = ninetyDaysAgo.toISOString();

  const currentMonth = "Last 30 days";

  // Activity Metrics - rolling 30-day window
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
        ? gte(credEventsTable.ts, thirtyDaysAgo)
        : and(
            gte(credEventsTable.ts, thirtyDaysAgo),
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

  // Content Creation - rolling 30-day window
  const [contentMetrics] = await db
    .select({
      newPoints: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(pointsTable)
    .where(
      space === "global"
        ? gte(pointsTable.createdAt, thirtyDaysAgo)
        : and(
            gte(pointsTable.createdAt, thirtyDaysAgo),
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
        ? gte(viewpointsTable.createdAt, thirtyDaysAgo)
        : and(
            gte(viewpointsTable.createdAt, thirtyDaysAgo),
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

  // New vs Returning Contributors - check across points, endorsements, and viewpoints
  const contributorMetrics = await db.execute(sql`
    WITH user_activity AS (
      -- Get all users active in last 90 days with their earliest activity date
      SELECT DISTINCT
        user_id,
        MIN(earliest_activity) as user_earliest_activity
      FROM (
        -- Points created
        SELECT 
          ${pointsTable.createdBy} as user_id,
          MIN(${pointsTable.createdAt}) as earliest_activity
        FROM ${pointsTable}
        WHERE ${pointsTable.createdAt} >= ${ninetyDaysAgoIso}
          AND ${pointsTable.isActive} = true
          ${space === "global" ? sql`` : sql`AND ${pointsTable.space} = ${space}`}
        GROUP BY ${pointsTable.createdBy}
        
        UNION ALL
        
        -- Endorsements made  
        SELECT 
          ${endorsementsTable.userId} as user_id,
          MIN(${endorsementsTable.createdAt}) as earliest_activity
        FROM ${endorsementsTable}
        WHERE ${endorsementsTable.createdAt} >= ${ninetyDaysAgoIso}
          ${space === "global" ? sql`` : sql`AND ${endorsementsTable.space} = ${space}`}
        GROUP BY ${endorsementsTable.userId}
        
        UNION ALL
        
        -- Viewpoints created
        SELECT 
          ${viewpointsTable.createdBy} as user_id,
          MIN(${viewpointsTable.createdAt}) as earliest_activity
        FROM ${viewpointsTable}
        WHERE ${viewpointsTable.createdAt} >= ${ninetyDaysAgoIso}
          AND ${viewpointsTable.isActive} = true
          ${space === "global" ? sql`` : sql`AND ${viewpointsTable.space} = ${space}`}
        GROUP BY ${viewpointsTable.createdBy}
      ) combined_activity
      GROUP BY user_id
    ),
    user_history AS (
      -- Check if each user had any activity before 30 days ago
      SELECT 
        ua.user_id,
        ua.user_earliest_activity,
        CASE WHEN EXISTS (
          -- Check points
          SELECT 1 FROM ${pointsTable} 
          WHERE ${pointsTable.createdBy} = ua.user_id 
            AND ${pointsTable.createdAt} < ${thirtyDaysAgoIso}
            AND ${pointsTable.isActive} = true
            ${space === "global" ? sql`` : sql`AND ${pointsTable.space} = ${space}`}
          
          UNION ALL
          
          -- Check endorsements  
          SELECT 1 FROM ${endorsementsTable}
          WHERE ${endorsementsTable.userId} = ua.user_id 
            AND ${endorsementsTable.createdAt} < ${thirtyDaysAgoIso}
            ${space === "global" ? sql`` : sql`AND ${endorsementsTable.space} = ${space}`}
          
          UNION ALL
          
          -- Check viewpoints
          SELECT 1 FROM ${viewpointsTable}
          WHERE ${viewpointsTable.createdBy} = ua.user_id 
            AND ${viewpointsTable.createdAt} < ${thirtyDaysAgoIso}
            AND ${viewpointsTable.isActive} = true
            ${space === "global" ? sql`` : sql`AND ${viewpointsTable.space} = ${space}`}
        ) THEN false ELSE true END as is_new_contributor
      FROM user_activity ua
    )
    SELECT 
      COUNT(*) as total_contributors,
      COUNT(CASE WHEN is_new_contributor THEN 1 END) as new_contributors
    FROM user_history
  `);

  const contributorStats = contributorMetrics[0] as {
    total_contributors: number;
    new_contributors: number;
  };

  // Calculate derived metrics
  const dailyActivity = Math.round(
    (activityMetrics?.totalTransactions || 0) / 30
  );
  const contentCreation =
    (contentMetrics?.newPoints || 0) + (rationaleMetrics?.newRationales || 0);

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
    contributorStats?.total_contributors &&
    contributorStats.total_contributors > 0
      ? (contributorStats.new_contributors || 0) /
        contributorStats.total_contributors
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
  };
}
