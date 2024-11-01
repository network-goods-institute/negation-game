"use server";

import { getUserId } from "@/actions/getUserId";
import { endorsementsTable, pointsWithStatsView } from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, sql } from "drizzle-orm";

export const fetchPoint = async (id: number) => {
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
    .where(eq(pointsWithStatsView.id, id))
    .limit(1)
    .then((points) => points[0]);
};
