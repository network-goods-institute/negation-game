"use server";

import { getSpace } from "@/actions/getSpace";
import { getUserId } from "@/actions/getUserId";
import {
  endorsementsTable,
  pointsWithDetailsView,
  doubtsTable,
  usersTable,
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
} from "./utils/pointSqlUtils";

export type UserEndorsedPoint = {
  pointId: number;
  content: string;
  createdAt: Date;
  createdBy: string;
  cred: number;
  amountSupporters: number;
  amountNegations: number;
  negationsCred: number;
  favor: number;
  space: string | null;
  endorsedCred: number;
  viewerCred: number;
  negationIds: number[];
  restakesByPoint: number;
  slashedAmount: number;
  doubtedAmount: number;
  totalRestakeAmount: number;
  doubt?: {
    id: number | null;
    amount: number | null;
    userAmount: number;
    isUserDoubt: boolean;
  } | null;
};

export const fetchUserEndorsedPoints = async (
  username?: string
): Promise<UserEndorsedPoint[] | null> => {
  const viewerId = await getUserId();
  if (!viewerId) return [];

  const space = await getSpace();

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
    .where(
      and(
        eq(endorsementsTable.userId, targetUserId),
        eq(endorsementsTable.space, space)
      )
    );

  if (endorsedPointIds.length === 0) return [];

  const pointIds = endorsedPointIds.map((e) => e.pointId);

  return db
    .select({
      ...getColumns(pointsWithDetailsView),
      endorsedCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId}
            AND ${endorsementsTable.userId} = ${targetUserId}
        ), 0)
      `.mapWith(Number),
      viewerCred: viewerCredSql(viewerId),
      restakesByPoint: restakesByPointSql,
      slashedAmount: slashedAmountSql,
      doubtedAmount: doubtedAmountSql,
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
