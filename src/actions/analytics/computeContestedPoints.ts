"use server";

import { db } from "@/services/db";
import {
  dailyStancesTable,
  pointsTable,
  endorsementsTable,
  pointClustersTable,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface ContestedPoint {
  pointId: number;
  content: string;
  positive: number;
  negative: number;
  contestedScore: number; // 0–1 higher = more contested
}

export async function computeContestedPoints({
  snapDay = new Date().toISOString().slice(0, 10),
  limit = 10,
}: {
  snapDay?: string;
  limit?: number;
}): Promise<ContestedPoint[]> {
  const snapDate = new Date(snapDay);

  console.log(`[computeContestedPoints] Starting for ${snapDay}`);

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
    .where(eq(dailyStancesTable.snapDay, snapDate))
    .groupBy(dailyStancesTable.pointId)
    .having(
      sql`SUM(CASE WHEN ${dailyStancesTable.zValue} > 0.02 THEN 1 ELSE 0 END) > 0 AND SUM(CASE WHEN ${dailyStancesTable.zValue} < -0.02 THEN 1 ELSE 0 END) > 0`
    )
    .orderBy(
      sql`GREATEST(SUM(CASE WHEN ${dailyStancesTable.zValue} > 0.02 THEN 1 ELSE 0 END), 1) DESC`
    );

  let aggRows = rows;
  if (rows.length === 0) {
    console.log(
      "[computeContestedPoints] No snapshot rows, using endorsement fallback"
    );
    aggRows = await db
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
      .groupBy(endorsementsTable.pointId)
      .having(sql`SUM(${endorsementsTable.cred}) <> 0`);

    console.log(
      `[computeContestedPoints] endorsement fallback rows: ${aggRows.length}`
    );
    if (!aggRows.length) return [];
  }

  const sourceRows = aggRows;

  console.log(
    `[computeContestedPoints] source rows after fallback: ${sourceRows.length}`
  );

  const pointIds = sourceRows.map((r) => r.pointId);
  const contents = await db
    .select({ id: pointsTable.id, content: pointsTable.content })
    .from(pointsTable)
    .where(sql`${pointsTable.id} IN (${sql.raw(pointIds.join(","))})`);
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
