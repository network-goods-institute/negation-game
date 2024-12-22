"use server";

import { getUserId } from "@/actions/getUserId";
import { endorsementsTable, pointsWithDetailsView, pointFavorHistoryView } from "@/db/schema";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { Timestamp } from "@/types/Timestamp";
import { desc, sql } from "drizzle-orm";

export const fetchFeedPage = async (olderThan?: Timestamp) => {
  const viewerId = await getUserId();

  return await db
    .select({
      ...getColumns(pointsWithDetailsView),
      favor: sql<number>`
        COALESCE((
          SELECT ${pointFavorHistoryView.favor}
          FROM ${pointFavorHistoryView}
          WHERE ${pointFavorHistoryView.pointId} = ${pointsWithDetailsView.id}
          AND ${pointFavorHistoryView.eventType} = 'favor_queried'
          ORDER BY ${pointFavorHistoryView.eventTime} DESC
          LIMIT 1
        ), 0)
      `.mapWith(Number),
      ...(viewerId
        ? {
            viewerCred: sql<number>`
              COALESCE((
                SELECT SUM(${endorsementsTable.cred})
                FROM ${endorsementsTable}
                WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.id}
                  AND ${endorsementsTable.userId} = ${viewerId}
              ), 0)
            `.mapWith(Number),
          }
        : {}),
    })
    .from(pointsWithDetailsView)
    .orderBy(desc(pointsWithDetailsView.createdAt));
};
