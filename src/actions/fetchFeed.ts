"use server";

import { getUserId } from "@/actions/getUserId";
import { endorsementsTable, negationsTable, pointsTable } from "@/db/schema";
import { db } from "@/services/db";
import { Timestamp } from "@/types/Timestamp";
import {
  count,
  countDistinct,
  desc,
  eq,
  getTableColumns,
  ne,
  or,
  sql,
  sum,
} from "drizzle-orm";

export const fetchFeedPage = async (olderThan?: Timestamp) => {
  const viewerId = await getUserId();

  return await db
    .select({
      ...getTableColumns(pointsTable),
      amountNegations: count(negationsTable.id),
      amountSupporters: count(endorsementsTable.userId),
      negationIds: sql`array_cat(
        ARRAY_AGG(${negationsTable.newerPointId}) FILTER (WHERE ${ne(negationsTable.newerPointId, pointsTable.id)}),
        ARRAY_AGG(${negationsTable.olderPointId}) FILTER (WHERE ${ne(negationsTable.olderPointId, pointsTable.id)})
      )`.as("negation_ids"),
      cred: sql`COALESCE(${sum(endorsementsTable.cred)}, 0)`.mapWith(Number),
      ...(viewerId
        ? {
            viewerCred: sum(
              sql`CASE WHEN ${eq(endorsementsTable.userId, viewerId)} THEN ${endorsementsTable.cred} ELSE 0 END`
            ).mapWith(Number),
            viewerEndorsedNegations: sql`
            COUNT(
              CASE WHEN ${eq(endorsementsTable.userId, viewerId)} 
              AND (${eq(negationsTable.newerPointId, endorsementsTable.pointId)} 
              OR ${eq(negationsTable.olderPointId, endorsementsTable.pointId)}) 
              THEN 1 ELSE NULL END
            )
          `.mapWith(Number),
          }
        : {}),
    })
    .from(pointsTable)
    .leftJoin(
      negationsTable,
      or(
        eq(pointsTable.id, negationsTable.newerPointId),
        eq(pointsTable.id, negationsTable.olderPointId)
      )
    )
    .leftJoin(endorsementsTable, eq(pointsTable.id, endorsementsTable.pointId))
    .groupBy(pointsTable.id, endorsementsTable.userId)
    .orderBy(desc(pointsTable.id))
    .limit(10);
};
