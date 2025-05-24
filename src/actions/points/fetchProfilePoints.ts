"use server";

import { db } from "@/services/db";
import { pointsWithDetailsView, doubtsTable, usersTable } from "@/db/schema";
import { getUserId } from "@/actions/users/getUserId";
import { eq, and } from "drizzle-orm";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { sql } from "drizzle-orm";
import { deduplicatePoints } from "@/db/utils/deduplicatePoints";
import {
  viewerCredSql,
  restakesByPointSql,
  slashedAmountSql,
  doubtedAmountSql,
  totalRestakeAmountSql,
  viewerDoubtSql,
} from "@/actions/utils/pointSqlUtils";

export type ProfilePoint = {
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
  viewerCred?: number;
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

export const fetchProfilePoints = async (
  username?: string
): Promise<ProfilePoint[] | null> => {
  const userId = await getUserId();

  // If no username provided, use the current user's ID
  let targetUserId = userId;

  // If username provided, look up the user
  if (username) {
    const user = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (user.length === 0) return null;
    targetUserId = user[0].id;
  }

  // If no target user could be determined (e.g., viewer not logged in and no username provided)
  if (!targetUserId) return [];

  // Ensure targetUserId is not null before using in eq()
  const whereCondition = eq(pointsWithDetailsView.createdBy, targetUserId);

  return (
    db
      .select({
        ...getColumns(pointsWithDetailsView),
        viewerCred: viewerCredSql(userId),
        restakesByPoint: restakesByPointSql(pointsWithDetailsView),
        slashedAmount: slashedAmountSql(pointsWithDetailsView),
        doubtedAmount: doubtedAmountSql(pointsWithDetailsView),
        totalRestakeAmount: totalRestakeAmountSql,
        doubt: userId
          ? viewerDoubtSql(userId)
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
          eq(doubtsTable.userId, userId ?? "")
        )
      )
      // Filter points created by the TARGET user
      .where(whereCondition)
      .then((results) => {
        const uniquePoints = deduplicatePoints(results);
        return addFavor(uniquePoints);
      })
  );
};
