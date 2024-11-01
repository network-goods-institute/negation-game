"use server";

import { getUserId } from "@/actions/getUserId";
import {
  endorsementsTable,
  negationsTable,
  pointsWithStatsView,
} from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";

export const fetchPointNegations = async (id: number) => {
  const viewerId = await getUserId();

  return await db
    .select({
      ...getColumns(pointsWithStatsView),
      ...(viewerId
        ? {
            viewerCred: sql<number>`
              COALESCE((
                SELECT SUM(${endorsementsTable.cred})
                FROM ${endorsementsTable}
                WHERE ${endorsementsTable.pointId} = ${pointsWithStatsView.id}
                  AND ${endorsementsTable.userId} = ${viewerId}
              ), 0)
            `.mapWith(Number),
          }
        : {}),
    })
    .from(pointsWithStatsView)
    .innerJoin(
      negationsTable,
      or(
        eq(negationsTable.olderPointId, id),
        eq(negationsTable.newerPointId, id)
      )
    )
    .where(
      and(
        or(
          eq(pointsWithStatsView.id, negationsTable.olderPointId),
          eq(pointsWithStatsView.id, negationsTable.newerPointId)
        ),
        ne(pointsWithStatsView.id, id)
      )
    )
    .orderBy(desc(pointsWithStatsView.cred));
};
