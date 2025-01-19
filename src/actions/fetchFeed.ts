"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import { endorsementsTable, pointsWithDetailsView, effectiveRestakesView, doubtsTable } from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { Timestamp } from "@/types/Timestamp";
import { desc, eq, sql, and } from "drizzle-orm";

export const fetchFeedPage = async (olderThan?: Timestamp) => {
  const viewerId = await getUserId();
  const space = await getSpace();

  const results = await db
    .select({
      ...getColumns(pointsWithDetailsView),
      ...(viewerId
        ? {
            viewerCred: sql<number>`
              COALESCE((
                SELECT SUM(${endorsementsTable.cred})
                FROM ${endorsementsTable}
                WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId}
                  AND ${endorsementsTable.userId} = ${viewerId}
              ), 0)
            `.mapWith(Number),
          }
        : {}),
      restakesByPoint: sql<number>`
        COALESCE(
          (SELECT SUM(er1.amount)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}
           AND er1.is_active = true), 
          0
        )
      `.mapWith(Number),
      slashedAmount: sql<number>`
        COALESCE(
          (SELECT SUM(er1.slashed_amount)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}), 
          0
        )
      `.mapWith(Number),
      doubtedAmount: sql<number>`
        COALESCE(
          (SELECT SUM(er1.doubted_amount)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}), 
          0
        )
      `.mapWith(Number),
    })
    .from(pointsWithDetailsView)
    .where(eq(pointsWithDetailsView.space, space))
    .orderBy(desc(pointsWithDetailsView.createdAt))
    .then((points) => {
      console.log('Raw points with full detail:', JSON.stringify(points, null, 2));
      return addFavor(points);
    });

  return results;
};
