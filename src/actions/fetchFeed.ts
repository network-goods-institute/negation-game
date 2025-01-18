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
            restake: {
              amount: effectiveRestakesView.effectiveAmount,
              slashedAmount: effectiveRestakesView.slashedAmount,
              doubtedAmount: sql<number>`
                COALESCE((
                  SELECT SUM(${doubtsTable.amount})::integer
                  FROM ${doubtsTable}
                  WHERE ${doubtsTable.pointId} = ${effectiveRestakesView.pointId}
                  AND ${doubtsTable.negationId} = ${effectiveRestakesView.negationId}
                ), 0)
              `.mapWith(Number),
              totalRestakeAmount: sql<number>`
                SUM(${effectiveRestakesView.effectiveAmount}) OVER (
                  PARTITION BY ${effectiveRestakesView.pointId}, ${effectiveRestakesView.negationId}
                )
              `.as('total_restake_amount')
            }
          }
        : {}),
      restakesByPoint: sql<number>`
        COALESCE(
          (SELECT SUM(er1.effective_amount)
           FROM ${effectiveRestakesView} AS er1
           WHERE er1.point_id = ${pointsWithDetailsView.pointId}
           AND er1.is_active = true), 
          0
        )
      `.mapWith(Number),
    })
    .from(pointsWithDetailsView)
    .leftJoin(
      effectiveRestakesView,
      and(
        eq(effectiveRestakesView.pointId, pointsWithDetailsView.pointId),
        eq(effectiveRestakesView.userId, viewerId ?? ''),
        eq(effectiveRestakesView.isActive, true)
      )
    )
    .where(eq(pointsWithDetailsView.space, space))
    .orderBy(desc(pointsWithDetailsView.createdAt))
    .then((points) => {
      console.log('Raw points before favor:', points);
      return addFavor(points);
    });

  console.log('Points with favor:', results);
  return results;
};
