"use server";

import { getUserId } from "@/actions/getUserId";
import { endorsementsTable, pointsWithDetailsView, restakesTable } from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, and, sql } from "drizzle-orm";

export const fetchPoint = async (id: number) => {
  const viewerId = await getUserId();

  return await db
    .select({
      ...getColumns(pointsWithDetailsView),
      ...(viewerId
        ? {
            viewerCred: sql<number>`
              COALESCE((
                SELECT SUM(${endorsementsTable.cred})
                FROM ${endorsementsTable}
                WHERE ${endorsementsTable.pointId} = ${id}
                  AND ${endorsementsTable.userId} = ${viewerId}
              ), 0)
            `.mapWith(Number),
            restake: {
              id: restakesTable.id,
              amount: restakesTable.amount,
              active: restakesTable.active,
            }
          }
        : {}),
    })
    .from(pointsWithDetailsView)
    .leftJoin(
      restakesTable,
      and(
        eq(restakesTable.pointId, id),
        eq(restakesTable.userId, viewerId ?? ''),
        eq(restakesTable.active, true)
      )
    )
    .where(eq(pointsWithDetailsView.pointId, id))
    .limit(1)
    .then((points) => points[0]);
};
