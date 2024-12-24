"use server";

import { getUserId } from "@/actions/getUserId";
import { endorsementsTable, pointsWithDetailsView, effectiveRestakesView, slashesTable } from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { eq, and, sql } from "drizzle-orm";

export const fetchPoint = async (id: number) => {
  const viewerId = await getUserId();

  // If no viewer, return basic point details
  if (!viewerId) {
    return await db
      .select({
        ...getColumns(pointsWithDetailsView),
      })
      .from(pointsWithDetailsView)
      .where(eq(pointsWithDetailsView.id, id))
      .limit(1)
      .then((points) => points[0]);
  }

  // With viewer, get full details
  return await db
    .select({
      ...getColumns(pointsWithDetailsView),
      viewerCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${id}
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
    })
    .from(pointsWithDetailsView)
    .leftJoin(
      effectiveRestakesView,
      and(
        eq(effectiveRestakesView.pointId, id),
        eq(effectiveRestakesView.userId, viewerId),
        eq(effectiveRestakesView.isActive, true)
      )
    )
    .leftJoin(
      slashesTable,
      and(
        eq(slashesTable.pointId, id),
        eq(slashesTable.userId, viewerId),
      )
    )
    .where(eq(pointsWithDetailsView.id, id))
    .limit(1)
    .then((points) => points[0]);
};
