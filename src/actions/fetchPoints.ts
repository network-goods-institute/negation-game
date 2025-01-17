"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import { 
  endorsementsTable, 
  pointsWithDetailsView,
  effectiveRestakesView,
  slashesTable 
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { and, eq, inArray, sql } from "drizzle-orm";

export const fetchPoints = async (ids: number[]) => {
  const viewerId = await getUserId();
  const space = await getSpace();

  return await db
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
              id: effectiveRestakesView.pointId,
              amount: effectiveRestakesView.effectiveAmount,
              active: effectiveRestakesView.isActive,
              originalAmount: effectiveRestakesView.amount,
              slashedAmount: effectiveRestakesView.slashedAmount
            },
            slash: {
              id: slashesTable.id,
              amount: slashesTable.amount,
            }
          }
        : {}),
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
    .leftJoin(
      slashesTable,
      and(
        eq(slashesTable.pointId, pointsWithDetailsView.pointId),
        eq(slashesTable.userId, viewerId ?? '')
      )
    )
    .where(
      and(
        inArray(pointsWithDetailsView.pointId, ids),
        eq(pointsWithDetailsView.space, space)
      )
    )
    .then(addFavor);
};
