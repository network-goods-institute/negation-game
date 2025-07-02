"use server";

import { db } from "@/services/db";
import {
  dailyStancesTable,
  pointsTable,
  endorsementsTable,
  pointClustersTable,
  negationsTable,
} from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { dailySnapshotJob } from "@/actions/analytics/dailySnapshotJob";

export interface ContestedPoint {
  pointId: number;
  content: string;
  positive: number;
  negative: number;
  contestedScore: number; // 0–1 higher = more contested
}

export async function computeContestedPoints({
  snapDay = new Date().toISOString().slice(0, 10),
  limit = 50,
  space,
}: {
  snapDay?: string;
  limit?: number;
  space?: string;
}): Promise<ContestedPoint[]> {
  const snapDate = new Date(snapDay + "T00:00:00.000Z");

  // Aggregate counts of positive/negative stances per point
  const rows = await db
    .select({
      pointId: dailyStancesTable.pointId,
      pos: sql<number>`SUM(CASE WHEN ${dailyStancesTable.zValue} > 0.02 THEN 1 ELSE 0 END)`.mapWith(
        Number
      ),
      neg: sql<number>`SUM(CASE WHEN ${dailyStancesTable.zValue} < -0.02 THEN 1 ELSE 0 END)`.mapWith(
        Number
      ),
    })
    .from(dailyStancesTable)
    .where(
      space
        ? and(
            eq(dailyStancesTable.snapDay, snapDate),
            sql`EXISTS (
              SELECT 1 FROM ${pointsTable} p 
              WHERE p.id = ${dailyStancesTable.pointId} 
              AND p.space = ${space}
            )`
          )
        : eq(dailyStancesTable.snapDay, snapDate)
    )
    .groupBy(dailyStancesTable.pointId)
    .having(
      sql`SUM(CASE WHEN ${dailyStancesTable.zValue} > 0.02 THEN 1 ELSE 0 END) > 1 AND 
          SUM(CASE WHEN ${dailyStancesTable.zValue} < -0.02 THEN 1 ELSE 0 END) > 1 AND
          (SUM(CASE WHEN ${dailyStancesTable.zValue} > 0.02 THEN 1 ELSE 0 END) + 
           SUM(CASE WHEN ${dailyStancesTable.zValue} < -0.02 THEN 1 ELSE 0 END)) >= 5`
    )
    .orderBy(
      sql`GREATEST(SUM(CASE WHEN ${dailyStancesTable.zValue} > 0.02 THEN 1 ELSE 0 END), 1) DESC`
    );

  let aggRows = rows;

  if (rows.length === 0) {
    console.log(
      "[computeContestedPoints] No daily_stances data, triggering background snapshot generation"
    );

    // Trigger snapshot generation in background (fire and forget)
    // This will help future requests but doesn't delay this one
    dailySnapshotJob(snapDay).catch((error) => {
      console.error(
        "[computeContestedPoints] Background snapshot generation failed:",
        error
      );
    });

    // Immediately proceed to improved endorsement-based fallback
    console.log(
      "[computeContestedPoints] Using endorsement fallback (cluster sign if available)"
    );

    /* First attempt: use point_clusters.sign if the cluster data exists */
    const clusterAgg = await db
      .select({
        pointId: endorsementsTable.pointId,
        pos: sql<number>`SUM(CASE WHEN (${endorsementsTable.cred} > 0 AND ${pointClustersTable.sign} = 1) OR (${endorsementsTable.cred} < 0 AND ${pointClustersTable.sign} = -1) THEN 1 ELSE 0 END)`.mapWith(
          Number
        ),
        neg: sql<number>`SUM(CASE WHEN (${endorsementsTable.cred} > 0 AND ${pointClustersTable.sign} = -1) OR (${endorsementsTable.cred} < 0 AND ${pointClustersTable.sign} = 1) THEN 1 ELSE 0 END)`.mapWith(
          Number
        ),
      })
      .from(endorsementsTable)
      .innerJoin(
        pointClustersTable,
        eq(endorsementsTable.pointId, pointClustersTable.pointId)
      )
      .where(
        space
          ? sql`EXISTS (SELECT 1 FROM ${pointsTable} p WHERE p.id = ${endorsementsTable.pointId} AND p.space = ${space})`
          : sql`TRUE`
      )
      .groupBy(endorsementsTable.pointId).having(sql`
        SUM(${endorsementsTable.cred}) <> 0 AND
        SUM(CASE WHEN (${endorsementsTable.cred} > 0 AND ${pointClustersTable.sign} = 1) OR (${endorsementsTable.cred} < 0 AND ${pointClustersTable.sign} = -1) THEN 1 ELSE 0 END) > 1 AND
        SUM(CASE WHEN (${endorsementsTable.cred} > 0 AND ${pointClustersTable.sign} = -1) OR (${endorsementsTable.cred} < 0 AND ${pointClustersTable.sign} = 1) THEN 1 ELSE 0 END) > 1 AND
        (SUM(CASE WHEN (${endorsementsTable.cred} > 0 AND ${pointClustersTable.sign} = 1) OR (${endorsementsTable.cred} < 0 AND ${pointClustersTable.sign} = -1) THEN 1 ELSE 0 END) + 
         SUM(CASE WHEN (${endorsementsTable.cred} > 0 AND ${pointClustersTable.sign} = -1) OR (${endorsementsTable.cred} < 0 AND ${pointClustersTable.sign} = 1) THEN 1 ELSE 0 END)) >= 5
      `);

    if (clusterAgg.length > 0) {
      aggRows = clusterAgg;
      console.log(
        `[computeContestedPoints] Cluster-based fallback found ${aggRows.length} contested points`
      );
    } else {
      console.log(
        "[computeContestedPoints] Cluster data missing – using heuristic sign fallback"
      );

      const endorsementRows = await db
        .select({
          pointId: endorsementsTable.pointId,
          userId: endorsementsTable.userId,
          cred: endorsementsTable.cred,
        })
        .from(endorsementsTable)
        .where(
          space
            ? sql`EXISTS (
                SELECT 1 FROM ${pointsTable} p 
                WHERE p.id = ${endorsementsTable.pointId} 
                AND p.space = ${space}
              )`
            : sql`TRUE`
        );

      if (endorsementRows.length === 0) {
        console.log("[computeContestedPoints] No endorsements found");
        return [];
      }

      const allPointIds = [...new Set(endorsementRows.map((r) => r.pointId))];
      const signMap = await buildSignMap(allPointIds);

      const pointGroups = new Map<
        number,
        { pointId: number; endorsements: typeof endorsementRows }
      >();

      for (const row of endorsementRows) {
        if (!pointGroups.has(row.pointId)) {
          pointGroups.set(row.pointId, {
            pointId: row.pointId,
            endorsements: [],
          });
        }
        pointGroups.get(row.pointId)!.endorsements.push(row);
      }

      aggRows = [];
      for (const [pointId, group] of pointGroups) {
        const sign = signMap.get(pointId) || 1;

        let pos = 0;
        let neg = 0;

        for (const endorsement of group.endorsements) {
          if (endorsement.cred === 0) continue;

          // Positive stance if (cred > 0 AND sign = 1) OR (cred < 0 AND sign = -1)
          if (
            (endorsement.cred > 0 && sign === 1) ||
            (endorsement.cred < 0 && sign === -1)
          ) {
            pos++;
          }
          // Negative stance if (cred > 0 AND sign = -1) OR (cred < 0 AND sign = 1)
          else if (
            (endorsement.cred > 0 && sign === -1) ||
            (endorsement.cred < 0 && sign === 1)
          ) {
            neg++;
          }
        }

        // Only include contested points (both pos and neg > 0)
        if (pos > 1 && neg > 1 && pos + neg >= 5) {
          aggRows.push({ pointId, pos, neg });
        }
      }

      console.log(
        `[computeContestedPoints] Heuristic fallback found ${aggRows.length} contested points`
      );
    }
  }

  const sourceRows = aggRows;

  console.log(
    `[computeContestedPoints] Final source rows: ${sourceRows.length}`
  );

  if (sourceRows.length === 0) {
    return [];
  }

  const pointIds = sourceRows.map((r) => r.pointId);
  const contents = await db
    .select({ id: pointsTable.id, content: pointsTable.content })
    .from(pointsTable)
    .where(
      pointIds.length > 0
        ? sql`${pointsTable.id} IN (${sql.raw(pointIds.join(","))})`
        : sql`FALSE`
    );
  const contentMap: Record<number, string> = {};
  contents.forEach((c) => {
    contentMap[c.id] = c.content;
  });

  const scored = sourceRows.map((r) => {
    const pos = r.pos;
    const neg = r.neg;
    const contestedScore = Math.min(pos, neg) / Math.max(pos, neg);
    return {
      pointId: r.pointId,
      content: contentMap[r.pointId] || "(content missing)",
      positive: pos,
      negative: neg,
      contestedScore,
    } as ContestedPoint;
  });

  const result = scored
    .sort((a, b) => b.contestedScore - a.contestedScore)
    .slice(0, limit);

  console.log(
    `[computeContestedPoints] returning ${result.length} contested points`
  );

  return result;
}

/**
 * Build a sign map for points based on their negation relationships
 * Similar to how delta computation determines signs
 */
async function buildSignMap(pointIds: number[]): Promise<Map<number, 1 | -1>> {
  const signMap = new Map<number, 1 | -1>();

  if (pointIds.length === 0) return signMap;

  // For each point, try to determine its sign relative to other points
  // We'll use a simple heuristic: points that are negated more often get sign -1
  const negationCounts = await db
    .select({
      pointId: sql<number>`CASE 
        WHEN ${negationsTable.olderPointId} IN (${sql.raw(pointIds.join(","))}) THEN ${negationsTable.olderPointId}
        WHEN ${negationsTable.newerPointId} IN (${sql.raw(pointIds.join(","))}) THEN ${negationsTable.newerPointId}
        ELSE NULL
      END`.mapWith(Number),
      negationCount: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(negationsTable)
    .where(
      and(
        eq(negationsTable.isActive, true),
        sql`(${negationsTable.olderPointId} IN (${sql.raw(pointIds.join(","))}) OR ${negationsTable.newerPointId} IN (${sql.raw(pointIds.join(","))}))`
      )
    ).groupBy(sql`CASE 
      WHEN ${negationsTable.olderPointId} IN (${sql.raw(pointIds.join(","))}) THEN ${negationsTable.olderPointId}
      WHEN ${negationsTable.newerPointId} IN (${sql.raw(pointIds.join(","))}) THEN ${negationsTable.newerPointId}
      ELSE NULL
    END`).having(sql`CASE 
      WHEN ${negationsTable.olderPointId} IN (${sql.raw(pointIds.join(","))}) THEN ${negationsTable.olderPointId}
      WHEN ${negationsTable.newerPointId} IN (${sql.raw(pointIds.join(","))}) THEN ${negationsTable.newerPointId}
      ELSE NULL
    END IS NOT NULL`);

  // Calculate median negation count
  const counts = negationCounts
    .map((r) => r.negationCount)
    .sort((a, b) => a - b);
  const median = counts.length > 0 ? counts[Math.floor(counts.length / 2)] : 0;

  // Assign signs based on negation frequency
  for (const { pointId, negationCount } of negationCounts) {
    if (pointId) {
      signMap.set(pointId, negationCount > median ? -1 : 1);
    }
  }

  // Default to positive for points with no negation data
  for (const pointId of pointIds) {
    if (!signMap.has(pointId)) {
      signMap.set(pointId, 1);
    }
  }

  return signMap;
}
