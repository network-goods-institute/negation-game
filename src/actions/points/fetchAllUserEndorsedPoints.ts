"use server";

import { getUserId } from "@/actions/users/getUserId";
import {
  endorsementsTable,
  pointsWithDetailsView,
  doubtsTable,
  usersTable,
  negationsTable,
} from "@/db/schema";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { db } from "@/services/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { deduplicatePoints } from "@/db/utils/deduplicatePoints";
import {
  viewerCredSql,
  restakesByPointSql,
  slashedAmountSql,
  doubtedAmountSql,
  totalRestakeAmountSql,
  viewerDoubtSql,
} from "@/actions/utils/pointSqlUtils";
import type { UserEndorsedPoint } from "./fetchUserEndorsedPoints";

export const fetchAllUserEndorsedPoints = async (
  username?: string
): Promise<UserEndorsedPoint[] | null> => {
  const viewerId = await getUserId();
  if (!viewerId) return [];

  let targetUserId = viewerId;

  if (username) {
    const user = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (user.length === 0) return null;
    targetUserId = user[0].id;
  }

  const endorsedPointIds = await db
    .select({ pointId: endorsementsTable.pointId })
    .from(endorsementsTable)
    .where(eq(endorsementsTable.userId, targetUserId));

  if (endorsedPointIds.length === 0) return [];

  const pointIds = endorsedPointIds.map((e) => e.pointId);

  return db
    .select({
      ...getColumns(pointsWithDetailsView),
      viewerNegationsCred: viewerId
        ? sql<number>`
            COALESCE((
              SELECT SUM(${endorsementsTable.cred})
              FROM ${endorsementsTable}
              WHERE ${endorsementsTable.userId} = ${viewerId}
                AND ${endorsementsTable.pointId} IN (
                  SELECT older_point_id FROM ${negationsTable} WHERE newer_point_id = ${pointsWithDetailsView.pointId}
                  UNION
                  SELECT newer_point_id FROM ${negationsTable} WHERE older_point_id = ${pointsWithDetailsView.pointId}
                )
            ), 0)
          `.mapWith(Number)
        : sql<number>`0`.mapWith(Number),
      endorsedCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId}
            AND ${endorsementsTable.userId} = ${targetUserId}
        ), 0)
      `.mapWith(Number),
      viewerCred: viewerCredSql(viewerId),
      restakesByPoint: restakesByPointSql(pointsWithDetailsView),
      slashedAmount: slashedAmountSql(pointsWithDetailsView),
      doubtedAmount: doubtedAmountSql(pointsWithDetailsView),
      totalRestakeAmount: totalRestakeAmountSql,
      doubt: viewerId
        ? viewerDoubtSql(viewerId)
        : {
            id: sql<number | null>`null`.mapWith((v) => v),
            amount: sql<number | null>`null`.mapWith((v) => v),
            userAmount: sql<number>`0`.mapWith(Number),
            isUserDoubt: sql<boolean>`false`.mapWith(Boolean),
          },
    })
    .from(pointsWithDetailsView)
    .leftJoin(
      doubtsTable,
      and(
        eq(doubtsTable.pointId, pointsWithDetailsView.pointId),
        eq(doubtsTable.userId, viewerId)
      )
    )
    .where(inArray(pointsWithDetailsView.pointId, pointIds))
    .then((results) => {
      const uniquePoints = deduplicatePoints(results);
      return addFavor(uniquePoints);
    });
};
