"use server";

import { restakesTable } from "@/db/schema";
import { db } from "@/services/db";
import { and, eq, sql } from "drizzle-orm";

export const fetchTotalRestaked = async (pointId: number, negationId: number) => {
  const [smallerId, largerId] = pointId < negationId 
    ? [pointId, negationId] 
    : [negationId, pointId];

  return await db
    .select({
      totalAmount: sql<number>`COALESCE(sum(${restakesTable.amount}), 0)`,
      totalRestakers: sql<number>`COALESCE(count(distinct ${restakesTable.userId}), 0)`
    })
    .from(restakesTable)
    .where(
      and(
        eq(restakesTable.pointId, smallerId),
        eq(restakesTable.negationId, largerId),
      )
    )
    .then(rows => rows[0] ?? { totalAmount: 0, totalRestakers: 0 });
}; 