"use server";

import { db } from "@/services/db";
import {
  pointsWithDetailsView,
  endorsementsTable,
  effectiveRestakesView,
  doubtsTable,
  usersTable,
} from "@/db/schema";
import { getUserId } from "@/actions/getUserId";
import { eq, and } from "drizzle-orm";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { sql } from "drizzle-orm";
import { deduplicatePoints } from "@/db/utils/deduplicatePoints";

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
    id: number;
    amount: number;
    userAmount: number;
    isUserDoubt: boolean;
  } | null;
};

export const fetchProfilePoints = async (
  username?: string
): Promise<ProfilePoint[] | null> => {
  const userId = await getUserId();
  if (!userId) return [];

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

  return db
    .select({
      ...getColumns(pointsWithDetailsView),
      viewerCred: sql<number>`
        COALESCE((
          SELECT SUM(${endorsementsTable.cred})
          FROM ${endorsementsTable}
          WHERE ${endorsementsTable.pointId} = ${pointsWithDetailsView.pointId}
            AND ${endorsementsTable.userId} = ${userId}
        ), 0)
      `.mapWith(Number),
      restakesByPoint: sql<number>`
        COALESCE((
          SELECT SUM(er1.amount)
          FROM ${effectiveRestakesView} AS er1
          WHERE er1.point_id = ${pointsWithDetailsView.pointId}
            AND er1.slashed_amount < er1.amount
        ), 0)
      `.mapWith(Number),
      slashedAmount: sql<number>`
        COALESCE((
          SELECT SUM(er1.slashed_amount)
          FROM ${effectiveRestakesView} AS er1
          WHERE er1.point_id = ${pointsWithDetailsView.pointId}
        ), 0)
      `.mapWith(Number),
      doubtedAmount: sql<number>`
        COALESCE((
          SELECT SUM(er1.doubted_amount)
          FROM ${effectiveRestakesView} AS er1
          WHERE er1.point_id = ${pointsWithDetailsView.pointId}
        ), 0)
      `.mapWith(Number),
      totalRestakeAmount: sql<number>`
        COALESCE((
          SELECT SUM(CASE 
            WHEN er.slashed_amount >= er.amount THEN 0
            ELSE er.amount
          END)
          FROM ${effectiveRestakesView} AS er
          WHERE er.point_id = ${pointsWithDetailsView.pointId}
          AND er.negation_id = ANY(${pointsWithDetailsView.negationIds})
        ), 0)
      `.mapWith(Number),
      doubt: {
        id: doubtsTable.id,
        amount: doubtsTable.amount,
        userAmount: doubtsTable.amount,
        isUserDoubt: sql<boolean>`${doubtsTable.userId} = ${userId}`.as(
          "is_user_doubt"
        ),
      },
    })
    .from(pointsWithDetailsView)
    .leftJoin(
      doubtsTable,
      and(
        eq(doubtsTable.pointId, pointsWithDetailsView.pointId),
        eq(doubtsTable.userId, userId)
      )
    )
    .where(eq(pointsWithDetailsView.createdBy, targetUserId))
    .then((results) => {
      const uniquePoints = deduplicatePoints(results);
      return addFavor(uniquePoints);
    });
};
