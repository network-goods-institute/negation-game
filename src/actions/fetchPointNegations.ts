"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import {
  endorsementsTable,
  negationsTable,
  pointsWithDetailsView,
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";

export const fetchPointNegations = async (id: number) => {
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
          }
        : {}),
    })
    .from(pointsWithDetailsView)
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
          eq(pointsWithDetailsView.pointId, negationsTable.olderPointId),
          eq(pointsWithDetailsView.pointId, negationsTable.newerPointId)
        ),
        ne(pointsWithDetailsView.pointId, id),
        eq(pointsWithDetailsView.space, space)
      )
    )
    .orderBy(desc(pointsWithDetailsView.cred))
    .then(addFavor);
};
